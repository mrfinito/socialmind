import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { negativeComment, context, platform, dna } = await req.json()
    const prompt = `Jestes ekspertem PR i kryzysow w social media z 15-letnim doswiadczeniem na polskim rynku. Pomagasz markom reagowac profesjonalnie na hejt, krytyke i kryzysy.

NEGATYWNY KOMENTARZ/SYTUACJA:
"${negativeComment}"

KONTEKST: ${context || 'brak'}
PLATFORMA: ${platform || 'Facebook'}
MARKA: ${dna?.brandName || 'Marka'} (ton: ${dna?.tone || 'profesjonalny'})

Przeanalizuj komentarz i zaproponuj 3 warianty odpowiedzi w roznych tonach + analize sytuacji.

Zwroc TYLKO JSON:
{
  "analysis": {
    "severity": "low|medium|high|critical",
    "intent": "Intencja autora - krytyka rzeczowa / hejt / trolling / autentyczny problem",
    "publicVisibility": "Jak bardzo publiczne to jest - prywatne / pod postem / viral",
    "responseUrgency": "natychmiast (1h) | dzis (do 4h) | dzisiaj | mozna poczekac",
    "potentialRisk": "Co moze sie stac jak nie zareagujemy / zareagujemy zle"
  },
  "responses": [
    {
      "tone": "deescalation",
      "label": "🕊️ Deeskalacja",
      "rationale": "Dlaczego ten ton tutaj zadziala",
      "publicReply": "Pelna odpowiedz publiczna pod komentarzem",
      "privateReply": "Sugerowana wiadomosc prywatna (jesli wartoscowa)",
      "tips": "Wskazowki - co dalej zrobic"
    },
    {
      "tone": "factual",
      "label": "📋 Merytoryczna",
      "rationale": "...",
      "publicReply": "...",
      "privateReply": "...",
      "tips": "..."
    },
    {
      "tone": "official",
      "label": "🎩 Oficjalna",
      "rationale": "...",
      "publicReply": "...",
      "privateReply": "...",
      "tips": "..."
    }
  ],
  "playbook": {
    "doNow": ["Akcja natychmiastowa 1", "Akcja 2", "Akcja 3"],
    "dontDo": ["Czego absolutnie nie robic 1", "Nie 2", "Nie 3"],
    "escalate": "Kiedy eskalowac wyzej (do CEO, prawnika, PR)",
    "monitor": "Co monitorowac przez najblizsze 24-72h",
    "longTermLessons": "Wnioski dlugoterminowe dla marki"
  },
  "templates": {
    "apology": "Szablon przeprosin (jesli zasadne)",
    "acknowledgment": "Szablon potwierdzenia problemu",
    "redirect": "Szablon przekierowania do supportu"
  }
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
