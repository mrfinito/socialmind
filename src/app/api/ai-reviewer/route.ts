import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkAnthropicKey } from '@/lib/aiGuards'
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const _envGuard = checkAnthropicKey()
  if (_envGuard) return _envGuard

  try {
    const { contentType, content, dna, context } = await req.json()
    const prompt = `Jestes senior content directorem z 15 latami doswiadczenia w social media. Robisz code review tresci marketingowej. Bez wody, konkretnie, krytycznie ale konstruktywnie.

TYP TRESCI: ${contentType}
${dna ? `MARKA: ${dna.brandName} (${dna.industry}, ton: ${dna.tone})` : ''}
${context ? `KONTEKST: ${context}` : ''}

TRESC DO OCENY:
"""${typeof content === 'string' ? content : JSON.stringify(content).slice(0, 5000)}"""

Zrob senior review. TYLKO JSON:
{
  "verdict": "🔴 Wymaga przepracowania | 🟡 Dobre, ale do poprawy | 🟢 Solidne | ⭐ Excellent",
  "score": 0-100,
  "executiveSummary": "TLDR w 2-3 zdaniach - co jest dobre, co zle, co priorytetowo poprawic",
  "strengths": [
    { "what": "Co jest dobre", "why": "Dlaczego to dziala" }
  ],
  "weaknesses": [
    { "severity": "blocker|major|minor", "what": "Co nie dziala", "why": "Dlaczego to problem", "impact": "Jak to wplywa na rezultat" }
  ],
  "missingElements": ["Czego brakuje 1", "Brakuje 2"],
  "specificImprovements": [
    { "where": "Gdzie konkretnie poprawic", "current": "Obecna wersja", "suggested": "Sugerowana zmiana", "rationale": "Dlaczego to lepsze" }
  ],
  "redFlags": ["Czerwona flaga 1 (jesli sa)", "Flaga 2"],
  "questions": ["Pytanie ktore senior strateg by zadal 1", "Pytanie 2"],
  "nextSteps": ["Co zrobic dalej #1", "#2", "#3"]
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
