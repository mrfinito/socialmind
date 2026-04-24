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
    const { dna, industry, platforms, country } = await req.json()
    const today = new Date().toLocaleDateString('pl', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    const brand = String(dna?.brandName || 'Marka').slice(0, 40)
    const ind = String(industry || dna?.industry || 'ogolna').slice(0, 40)
    const tone = String(dna?.tone || 'profesjonalny').slice(0, 60)
    const plt = Array.isArray(platforms) ? platforms.slice(0,2).join(', ') : 'facebook'

    const prompt = `RTM ekspert. Dzis: ${today}. Kraj: ${country||'Polska'}. Marka: ${brand}, branza: ${ind}, ton: ${tone}, platformy: ${plt}. Znajdz 3 okazje RTM na dzis i napisz posty.`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: `Generujesz okazje RTM jako JSON. Odpowiadasz TYLKO JSON zaczynajac od {.`,
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: '{"date":"' }
      ]
    })

    const rawContent = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    const raw = '{"date":"' + rawContent
    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })

  } catch (err) {
    console.error('RTM error:', err instanceof Error ? err.message : err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad RTM'
    }, { status: 500 })
  }
}
