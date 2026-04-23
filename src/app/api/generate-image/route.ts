import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const ASPECT_MAP: Record<string, string> = {
  facebook:  '16:9',
  instagram: '1:1',
  linkedin:  '16:9',
  x:         '16:9',
  pinterest: '2:3',
  tiktok:    '9:16',
}

const DALLE_SIZE_MAP: Record<string, '1024x1024' | '1792x1024' | '1024x1792'> = {
  facebook:  '1792x1024',
  instagram: '1024x1024',
  linkedin:  '1792x1024',
  x:         '1792x1024',
  pinterest: '1024x1792',
  tiktok:    '1024x1792',
}

async function generateWithDalle(prompt: string, platform: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error('Brak klucza OPENAI_API_KEY w .env.local')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const size = DALLE_SIZE_MAP[platform] || '1024x1024'
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: prompt.slice(0, 4000),
    n: 1,
    size,
    quality: 'standard',
    style: 'natural',
  })
  const data = response.data ?? []
  const url = data[0]?.url
  if (!url) throw new Error('Brak URL obrazka z DALL-E')
  return { url }
}

async function generateWithGemini(prompt: string, platform: string) {
  if (!process.env.GOOGLE_API_KEY) throw new Error('Brak klucza GOOGLE_API_KEY w .env.local')
  const aspectRatio = ASPECT_MAP[platform] || '1:1'
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${process.env.GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Generate an image. ${prompt}. Aspect ratio: ${aspectRatio}. High quality, commercial photography style.` }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    }
  )
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error?.message || 'Blad Google API')
  const parts = data?.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith('image/'))
  if (!imagePart?.inlineData?.data) throw new Error('Brak obrazka w odpowiedzi Google')
  return { url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, platform, provider = 'gemini' } = await req.json() as {
      prompt: string
      platform: string
      provider?: 'dalle' | 'gemini'
    }

    const result = provider === 'dalle'
      ? await generateWithDalle(prompt, platform)
      : await generateWithGemini(prompt, platform)

    return NextResponse.json({ ok: true, url: result.url, provider })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Blad generowania obrazka'
    console.error(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
