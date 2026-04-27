import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { robustParse } from '@/lib/parseJSON'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const limit = await checkGenerationLimit()
  if (!limit.allowed) return NextResponse.json({ error: limit.reason }, { status: 429 })

  const { text, dna, platform } = await req.json() as {
    text: string
    platform: string
    dna?: {
      brandName?: string
      tone?: string
      values?: string | string[]
      voice?: string
      audience?: string
      avoidWords?: string | string[]
      preferredWords?: string | string[]
    }
  }

  if (!text || text.trim().length < 10) {
    return NextResponse.json({ error: 'Wklej tekst do analizy (min 10 znakow)' }, { status: 400 })
  }

  if (!dna?.brandName || !dna.tone) {
    return NextResponse.json({ 
      error: 'Brak Brand DNA - skonfiguruj najpierw markę żeby AI miało punkt odniesienia' 
    }, { status: 400 })
  }

  const system = `Jestes copy editorem i strategiem marki z 15+ letnim doswiadczeniem. Oceniasz teksty pod katem:
- Zgodnosci z tonem marki
- Spojnosci z wartosciami
- Dopasowania do grupy docelowej
- Optymalizacji pod platforme

Twoja analiza jest konkretna - cytujesz fragmenty i wskazujesz konkretne poprawki.

Odpowiadasz WYLACZNIE poprawnym JSON.`

  const prompt = `BRAND DNA:
Marka: ${dna.brandName}
Ton: ${dna.tone}
${(() => {
  const v = dna.values
  if (!v) return ''
  const text = Array.isArray(v) ? v.join(', ') : (typeof v === 'string' ? v.trim() : '')
  return text ? `Wartosci: ${text}` : ''
})()}
${dna.voice ? `Glos marki: ${dna.voice}` : ''}
${dna.audience ? `Grupa docelowa: ${dna.audience}` : ''}
${(() => {
  const v = dna.avoidWords
  if (!v) return ''
  const text = Array.isArray(v) ? v.join(', ') : (typeof v === 'string' ? v.trim() : '')
  return text ? `Slowa do unikania: ${text}` : ''
})()}
${(() => {
  const v = dna.preferredWords
  if (!v) return ''
  const text = Array.isArray(v) ? v.join(', ') : (typeof v === 'string' ? v.trim() : '')
  return text ? `Preferowane slowa: ${text}` : ''
})()}

PLATFORMA: ${platform}

TEKST DO OCENY:
"""
${text.slice(0, 3000)}
"""

Oceń ten tekst pod katem zgodnosci z marka. JSON:
{
  "overallScore": 75,
  "verdict": "excellent|good|needs-work|off-brand",
  "summary": "2-3 zdania ogolnej oceny",
  "scores": {
    "tone": 80,
    "vocabulary": 70,
    "values": 85,
    "audienceFit": 75,
    "platformOptimization": 65
  },
  "strengths": [
    "Konkretne mocne strony - co dziala",
    "..."
  ],
  "issues": [
    {
      "severity": "high|medium|low",
      "category": "tone|vocabulary|structure|audience|platform",
      "fragment": "Cytat problematycznego fragmentu z tekstu",
      "problem": "Co konkretnie jest nie tak",
      "fix": "Konkretna sugestia poprawki",
      "rewrittenFragment": "Jak powinno brzmiec"
    }
  ],
  "suggestedRewrite": "Opcjonalnie: caly poprawiony tekst zachowujacy intencje ale zgodny z marka",
  "platformTips": [
    "Tip 1 specyficzny dla ${platform}",
    "Tip 2"
  ],
  "quickWins": [
    "Najszybsza zmiana ktora podniesie score o 10+",
    "..."
  ]
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system,
    messages: [{ role: 'user', content: prompt }]
  })

  const raw = response.content
    .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '').join('')

  const parsed = robustParse(raw)
  if (!parsed) return NextResponse.json({ error: 'Blad parsowania' }, { status: 500 })
  return NextResponse.json({ ok: true, data: parsed })
}
