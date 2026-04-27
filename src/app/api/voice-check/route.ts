import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkAnthropicKey } from '@/lib/aiGuards'
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const _envGuard = checkAnthropicKey()
  if (_envGuard) return _envGuard

  try {
    const { content, platform, dna } = await req.json()
    if (!dna) return NextResponse.json({ error: 'Brak Brand DNA - przejdź do zakładki Marka' }, { status: 400 })
    
    const prompt = `Jestes ekspertem od brand voice i copywritingu. Oceniasz zgodnosc tekstu z DNA marki.

BRAND DNA:
- Marka: ${dna.brandName}
- Branza: ${dna.industry}
- USP: ${dna.usp}
- Ton komunikacji: ${dna.tone}
- Persona: ${dna.persona || 'brak'}
- Wartosci: ${(() => {
  const v = dna.values
  if (!v) return 'brak'
  return Array.isArray(v) ? v.join(', ') : (typeof v === 'string' ? v : 'brak')
})()}

TEKST DO OCENY:
"""${content}"""

PLATFORMA: ${platform || 'ogolnie'}

Zrob szczegolowy audyt zgodnosci z marka. Zwroc TYLKO JSON:
{
  "overallScore": 0-100,
  "verdict": "perfect|good|needs-work|off-brand",
  "summary": "1-2 zdania ogolnej oceny",
  "scores": {
    "tone": { "score": 0-100, "comment": "Komentarz o tonie" },
    "vocabulary": { "score": 0-100, "comment": "Slownictwo i jezyk" },
    "values": { "score": 0-100, "comment": "Czy oddaje wartosci marki" },
    "audience": { "score": 0-100, "comment": "Czy mowi do persony" },
    "platform": { "score": 0-100, "comment": "Dopasowanie do platformy" }
  },
  "strengths": ["Mocna strona 1", "Mocna 2", "Mocna 3"],
  "issues": [
    { "severity": "high|medium|low", "what": "Co jest nie tak", "why": "Dlaczego to problem", "fix": "Jak naprawic" }
  ],
  "rewrittenVersion": "Pelna poprawiona wersja tekstu zachowujaca przekaz, zgodna z marka",
  "alternativeVariants": [
    { "label": "Bardziej formalny", "text": "..." },
    { "label": "Bardziej luzny", "text": "..." }
  ],
  "doMore": ["Rob wiecej tego 1", "Tego 2"],
  "avoidWords": ["Slowa do unikniecia w tekscie"]
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }]
    })
    const raw = response.content.map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '').join('')
    const start = raw.indexOf('{'), end = raw.lastIndexOf('}')
    if (start === -1) return NextResponse.json({ error: 'Brak JSON' }, { status: 500 })
    let clean = raw.slice(start, end+1)
    let parsed = null
    try { parsed = JSON.parse(clean) } catch {}
    if (!parsed) {
      clean = clean.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, m => m.replace(/\n/g, '\\n'))
      try { parsed = JSON.parse(clean) } catch {}
    }
    if (!parsed) return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad' }, { status: 500 })
  }
}
