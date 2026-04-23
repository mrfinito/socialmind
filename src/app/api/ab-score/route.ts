import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function robustParse(raw: string) {
  let clean = raw.replace(/```json\n?|```\n?/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
  if (s !== -1 && e !== -1) {
    clean = clean.slice(s, e + 1)
    try { return JSON.parse(clean) } catch {}
    clean = clean
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/,(\s*[}\]])/g, '$1')
    try { return JSON.parse(clean) } catch {}
  }
  throw new Error('Nie mozna przetworzyc odpowiedzi AI')
}



export async function POST(req: NextRequest) {

  try {
    const { topic, platform, masterPrompt, goal, tone } = await req.json()

    const prompt = `${masterPrompt || 'Jestes ekspertem od copywritingu social media.'}

Stwórz 3 warianty A/B/C posta na platforme: ${platform}
Temat: ${topic}
Cel: ${goal || 'zaangazowanie'}
Ton: ${tone || 'profesjonalny'}

Dla kazdego wariantu oceń go punktowo (0-100) w 5 kategoriach.

Odpowiedz TYLKO w JSON (bez markdown):
{
  "platform": "${platform}",
  "topic": "${topic}",
  "variants": [
    {
      "id": "A",
      "label": "Emocjonalny / storytelling",
      "text": "pelny tekst wariantu A (dostosowany do platformy)",
      "hook": "pierwsze zdanie",
      "strategy": "krotki opis strategii tego wariantu (1 zdanie)",
      "imagePrompt": "prompt do grafiki po angielsku",
      "scores": {
        "hook": 85,
        "clarity": 78,
        "cta": 90,
        "engagement": 88,
        "brandFit": 82
      },
      "totalScore": 85,
      "pros": ["zaleta 1", "zaleta 2"],
      "cons": ["wada 1"],
      "bestFor": "kiedy uzyc tego wariantu"
    },
    {
      "id": "B",
      "label": "Edukacyjny / ekspert",
      "text": "pelny tekst wariantu B",
      "hook": "pierwsze zdanie",
      "strategy": "krotki opis strategii",
      "imagePrompt": "prompt do grafiki po angielsku",
      "scores": {
        "hook": 72,
        "clarity": 92,
        "cta": 75,
        "engagement": 70,
        "brandFit": 88
      },
      "totalScore": 79,
      "pros": ["zaleta 1", "zaleta 2"],
      "cons": ["wada 1"],
      "bestFor": "kiedy uzyc tego wariantu"
    },
    {
      "id": "C",
      "label": "Sprzedazowy / CTA-driven",
      "text": "pelny tekst wariantu C",
      "hook": "pierwsze zdanie",
      "strategy": "krotki opis strategii",
      "imagePrompt": "prompt do grafiki po angielsku",
      "scores": {
        "hook": 90,
        "clarity": 80,
        "cta": 95,
        "engagement": 75,
        "brandFit": 78
      },
      "totalScore": 84,
      "pros": ["zaleta 1", "zaleta 2"],
      "cons": ["wada 1"],
      "bestFor": "kiedy uzyc tego wariantu"
    }
  ],
  "winner": "A",
  "winnerReason": "dlaczego ten wariant jest najlepszy dla tego celu i platformy",
  "testingTip": "praktyczna wskazowka jak przetestowac te warianty"
}`

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = response.content.map((b: {type: string; text?: string}) => (b.type === 'text' ? b.text : '')).join('')
    const parsed = robustParse(rawText)

    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Blad generowania A/B' }, { status: 500 })
  }
}
