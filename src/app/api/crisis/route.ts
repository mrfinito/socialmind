import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { robustParse } from '@/lib/parseJSON'
import { checkAnthropicKey, errorResponse, safeJsonBody } from '@/lib/aiGuards'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const keyGuard = checkAnthropicKey()
    if (keyGuard) return keyGuard

    const limit = await checkGenerationLimit()
    if (!limit.allowed) return NextResponse.json({ error: limit.reason }, { status: 429 })

    const parsed = await safeJsonBody<{
      commentText: string
      context?: string
      platform: string
      dna?: { brandName?: string; tone?: string; values?: string | string[] }
    }>(req)
    if (parsed.response) return parsed.response
    const { commentText, context, platform, dna } = parsed.body

  if (!commentText || commentText.trim().length < 3) {
    return NextResponse.json({ error: 'Wklej komentarz/tweet do analizy' }, { status: 400 })
  }

  const brand = dna?.brandName || 'marka'
  const tone = dna?.tone || 'profesjonalny'

  const system = `Jestes ekspertem od kryzysow PR i moderacji social media z 15+ letnim doswiadczeniem. Pomagasz markom reagowac na negatywne komentarze w sposob:
- Profesjonalny (nie obraza, nie atakuje)
- Empatyczny (rozumie frustracje)
- Konstruktywny (rozwiazuje lub wyjasnia)
- Zgodny z tonem marki

Odpowiadasz WYLACZNIE poprawnym JSON.`

  const prompt = `KOMENTARZ NEGATYWNY / KRYTYCZNY:
"${commentText}"

PLATFORMA: ${platform}
${context ? `KONTEKST (co go wywolalo): ${context}` : ''}
MARKA: ${brand}
TON MARKI: ${tone}
${(() => {
  const v = dna?.values
  if (!v) return ''
  const text = Array.isArray(v) ? v.join(', ') : (typeof v === 'string' ? v.trim() : '')
  return text ? `WARTOSCI MARKI: ${text}` : ''
})()}

Przeanalizuj komentarz i daj rekomendacje:

JSON:
{
  "analysis": {
    "type": "critique|complaint|troll|misinformation|brand-attack|legitimate-issue",
    "severity": "low|medium|high|critical",
    "sentiment": -100,
    "publicVisibility": "high|medium|low",
    "needsResponse": true,
    "responseUrgency": "immediate|within-1h|within-24h|optional",
    "keyTriggers": ["co wywoluje reakcje"],
    "underlying_emotion": "anger|disappointment|confusion|fear"
  },
  "responses": [
    {
      "approach": "deescalation",
      "label": "Deeskalacja - empatyczna",
      "text": "Tresc odpowiedzi po polsku - 2-4 zdania",
      "tone": "Cieply, rozumiejacy",
      "useWhen": "Gdy klient wyraznie sfrustrowany ale nie jest trollem"
    },
    {
      "approach": "factual",
      "label": "Merytoryczna - fakty",
      "text": "Tresc odpowiedzi z faktami i wyjasnieniem",
      "tone": "Rzeczowy, oparty na faktach",
      "useWhen": "Gdy komentarz zawiera nieprawdziwe info lub niezrozumienie"
    },
    {
      "approach": "official",
      "label": "Oficjalna - korporacyjna",
      "text": "Formalna odpowiedz",
      "tone": "Oficjalny, dyplomatyczny",
      "useWhen": "Gdy temat jest powazny / publicznie kontrowersyjny"
    }
  ],
  "actions": {
    "immediate": ["Co zrobic w ciagu 15 minut"],
    "shortTerm": ["Co w ciagu 24h"],
    "longTerm": ["Co dlugofalowo zeby uniknac powtorki"]
  },
  "doNotDo": [
    "Nie kasuj komentarza - moze eskalowac",
    "Nie odpowiadaj emocjonalnie",
    "..."
  ],
  "monitoring": {
    "watchFor": ["Sygnaly eskalacji", "Inne komentarze podobne"],
    "escalateIf": "Kiedy przekazac do PR/zarzadu"
  },
  "playbook": {
    "title": "Krotkie playbook dla zespolu",
    "steps": [
      "Krok 1: ...",
      "Krok 2: ..."
    ]
  }
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system,
    messages: [{ role: 'user', content: prompt }]
  })

  const raw = response.content
    .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '').join('')

  const parsedResult = robustParse(raw)
  if (!parsedResult) return NextResponse.json({ error: 'Blad parsowania' }, { status: 500 })
  return NextResponse.json({ ok: true, data: parsedResult })
  } catch (err) {
    return errorResponse(err, 'Crisis error')
  }
}
