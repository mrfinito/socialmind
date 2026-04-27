import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const ASPECT_MAP: Record<string, string> = {
  facebook: '16:9',
  instagram: '1:1',
  linkedin: '16:9',
  x: '16:9',
  pinterest: '2:3',
  tiktok: '9:16',
}

const DALLE_SIZE_MAP: Record<string, '1024x1024' | '1792x1024' | '1024x1792'> = {
  facebook: '1792x1024',
  instagram: '1024x1024',
  linkedin: '1792x1024',
  x: '1792x1024',
  pinterest: '1024x1792',
  tiktok: '1024x1792',
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Use Claude to refine prompt based on revision instructions
async function refinePrompt(originalPrompt: string, revisionInstructions: string): Promise<string> {
  if (!revisionInstructions) return originalPrompt

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Jestes ekspertem od promptow do generatorow obrazow AI (DALL-E, Gemini). 
Ulep ponizszy prompt zgodnie z instrukcjami uzytkownika. Zachowaj glowny koncept ale wprowadz zadane zmiany.

ORYGINALNY PROMPT:
${originalPrompt}

INSTRUKCJE ZMIAN OD UZYTKOWNIKA:
${revisionInstructions}

Zwroc TYLKO nowy prompt po angielsku, bez zadnego wyjasnienia. Prompt ma byc szczegolowy, wizualnie opisowy, profesjonalny.`
    }]
  })

  const text = response.content
    .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
    .join('')
    .trim()

  return text || originalPrompt
}

async function generateWithDalle(prompt: string, platform: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error('Brak klucza OPENAI_API_KEY')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90_000 })
  const size = DALLE_SIZE_MAP[platform] || '1024x1024'
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt.slice(0, 4000),
      n: 1,
      size,
      quality: 'standard',
      style: 'natural',
    })
    const url = response.data?.[0]?.url
    if (!url) throw new Error('Brak URL obrazka z DALL-E')
    return { url }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // Translate OpenAI errors to user-friendly Polish
    if (/billing.+limit|hard limit|insufficient.+quota/i.test(msg)) {
      throw new Error('💳 Wyczerpano limit OpenAI (DALL-E). Zwiększ limit na https://platform.openai.com/settings/organization/limits albo użyj Nano Banana (Gemini) — jest darmowe.')
    }
    if (/rate limit/i.test(msg)) {
      throw new Error('⏳ DALL-E rate limit przekroczony. Poczekaj minutę albo użyj Nano Banana.')
    }
    if (/content policy|safety/i.test(msg)) {
      throw new Error('🚫 DALL-E odrzucił prompt z powodów bezpieczeństwa. Zmień opis grafiki.')
    }
    throw e
  }
}

async function generateWithGemini(prompt: string, platform: string, attempt = 1): Promise<{ url: string }> {
  if (!process.env.GOOGLE_API_KEY) throw new Error('Brak klucza GOOGLE_API_KEY')
  const aspectRatio = ASPECT_MAP[platform] || '1:1'
  const MAX_ATTEMPTS = 3
  // Timeout 60s per attempt (3 attempts × 60s + 2 retries × 3s = max ~186s, but Vercel cuts at 120s
  // so realistically max 2 attempts will fit in 120s window)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  let response: Response
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Generate an image. ${prompt}. Aspect ratio: ${aspectRatio}. High quality, commercial photography style.` }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
        signal: controller.signal,
      }
    )
  } catch (e) {
    clearTimeout(timeout)
    if (e instanceof Error && e.name === 'AbortError') {
      // Timeout — retry once more (up to MAX_ATTEMPTS)
      if (attempt < MAX_ATTEMPTS) {
        console.log(`Gemini timeout (attempt ${attempt}), retrying after 3s...`)
        await new Promise(r => setTimeout(r, 3000))
        return generateWithGemini(prompt, platform, attempt + 1)
      }
      throw new Error(`Gemini przeciążony (timeout po ${MAX_ATTEMPTS} próbach). Spróbuj ponownie za chwilę.`)
    }
    throw e
  }
  clearTimeout(timeout)
  
  // Retry on 5xx / overloaded / quota errors
  if (response.status === 429 || response.status === 503 || response.status === 500 || response.status === 502 || response.status === 504) {
    if (attempt < MAX_ATTEMPTS) {
      const waitMs = 3000 * attempt  // 3s, 6s, 9s
      console.log(`Gemini status ${response.status} (attempt ${attempt}), retrying after ${waitMs}ms...`)
      await new Promise(r => setTimeout(r, waitMs))
      return generateWithGemini(prompt, platform, attempt + 1)
    }
  }
  
  const data = await response.json()
  if (!response.ok) {
    const errorMsg = data?.error?.message || `HTTP ${response.status}`
    // Final retry for transient errors caught in body
    if (attempt < MAX_ATTEMPTS && /overloaded|UNAVAILABLE|temporarily|rate limit/i.test(errorMsg)) {
      console.log(`Gemini error "${errorMsg}" (attempt ${attempt}), retrying after 3s...`)
      await new Promise(r => setTimeout(r, 3000))
      return generateWithGemini(prompt, platform, attempt + 1)
    }
    throw new Error(`Gemini: ${errorMsg}`)
  }
  
  const parts = data?.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith('image/'))
  if (!imagePart?.inlineData?.data) {
    // Sometimes Gemini returns text-only response (refused) — retry
    if (attempt < MAX_ATTEMPTS) {
      console.log(`Gemini returned no image (attempt ${attempt}), retrying...`)
      await new Promise(r => setTimeout(r, 2000))
      return generateWithGemini(prompt, platform, attempt + 1)
    }
    throw new Error('Gemini nie zwrócił obrazu po 3 próbach. Spróbuj zmienić prompt.')
  }
  return { url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, platform, provider = 'gemini', revision } = await req.json() as {
      prompt: string
      platform: string
      provider?: 'dalle' | 'gemini'
      revision?: string
    }

    // If revision instructions provided, refine the prompt first
    const finalPrompt = revision ? await refinePrompt(prompt, revision) : prompt

    // No auto-fallback — each provider only retries within itself.
    // Gemini retries 503/timeout up to 3x. DALL-E throws billing/rate errors clearly.
    const result = provider === 'dalle'
      ? await generateWithDalle(finalPrompt, platform)
      : await generateWithGemini(finalPrompt, platform)

    return NextResponse.json({
      ok: true,
      url: result.url,
      provider,
      finalPrompt,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Blad generowania obrazka'
    console.error('generate-image error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
