import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { robustParse } from '@/lib/parseJSON'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.reason, limit_exceeded: true }, { status: 429 })
  }

  try {
    const { dna, competitors, goals, budget, duration, platforms } = await req.json()
    const brand = String(dna?.brandName || 'Marka').slice(0, 40)
    const ind = String(dna?.industry || 'ogolna').slice(0, 40)
    const tone = String(dna?.tone || 'profesjonalny').slice(0, 60)
    const persona = String(dna?.persona || '').slice(0, 60)
    const plt = Array.isArray(platforms) ? platforms.slice(0,2).join(', ') : 'facebook'
    const dur = String(duration || '3 miesiace').slice(0, 20)
    const goalsStr = Array.isArray(goals) ? goals.slice(0,3).join(', ') : 'swiadomosc marki'

    const prompt = `Strateg SM. Krótka strategia dla: ${brand}, ${ind}, ton: ${tone}, persona: ${persona}, konkurenci: ${String(competitors||'').slice(0,50)}, cele: ${goalsStr}, budzet: ${String(budget||'').slice(0,20)}, ${dur}, platformy: ${plt}.`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: `Generujesz strategie social media jako JSON. Odpowiadasz TYLKO JSON zaczynajac od {.`,
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: '{"executiveSummary":"' }
      ]
    })

    const rawContent = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    const raw = '{"executiveSummary":"' + rawContent

    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })

  } catch (err) {
    console.error('Strategia error:', err instanceof Error ? err.message : err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad strategii'
    }, { status: 500 })
  }
}
