import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function robustParse(raw: string) {
  let clean = raw.replace(/```json\n?|```\n?/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
  if (s !== -1 && e !== -1) {
    clean = clean.slice(s, e + 1)
    try { return JSON.parse(clean) } catch {}
    clean = clean.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/,(\s*[}\]])/g, '$1')
    try { return JSON.parse(clean) } catch {}
  }
  throw new Error('Nie mozna przetworzyc odpowiedzi')
}

export async function POST(req: NextRequest) {
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.reason, limit_exceeded: true }, { status: 429 })
  }

  try {
    const { dna, industry, platforms, country } = await req.json()
    const today = new Date().toLocaleDateString('pl', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

    const prompt = `Jestes ekspertem od Real Time Marketingu i content marketingu.
Dzis jest: ${today}

Marka: ${dna?.brandName || 'Marka'}
Branza: ${industry || dna?.industry || 'ogolna'}
Ton: ${dna?.tone || 'profesjonalny'}
Platformy: ${(platforms || ['facebook','instagram']).join(', ')}
Kraj: ${country || 'Polska'}

Twoim zadaniem jest:
1. Zidentyfikowac aktualne trendy, newsy i wydarzenia ktore sa dzisiaj istotne
2. Znalezc kreatywne sposoby podpiecia sie komunikacyjnego dla marki z branzY ${industry || dna?.industry}
3. Wygenerowac gotowe posty RTM

Pamietaj o:
- Autentycznosci — marka musi sie naturalnie wpisywac w temat
- Szybkosci — RTM dziala 24-48h po wydarzeniu
- Kreatywnoci — szukaj nieoczywistych polaczen
- Unikaniu kontrowersyjnych tematow politycznych jezeli nie pasuja do marki

Odpowiedz TYLKO czystym JSON:
{
  "date": "${today}",
  "opportunities": [
    {
      "id": "opp1",
      "title": "nazwa trendu/newsa",
      "category": "sport|kultura|technologia|swieto|trend|news|meme",
      "relevance": "wysokie|srednie|niskie",
      "why": "dlaczego ten temat pasuje do tej marki",
      "risk": "ewentualne ryzyko komunikacyjne",
      "urgency": "dzisiaj|ten tydzien|ten miesiac",
      "posts": [
        {
          "platform": "facebook",
          "angle": "jak sie podpiac — krotki opis konceptu",
          "text": "gotowy tekst posta",
          "hook": "pierwsze zdanie",
          "hashtags": ["#rtm", "#trend"],
          "emoji": true,
          "imageIdea": "pomysl na grafike"
        },
        {
          "platform": "instagram",
          "angle": "jak sie podpiac",
          "text": "gotowy tekst posta",
          "hook": "pierwsze zdanie",
          "hashtags": ["#rtm", "#trend"],
          "emoji": true,
          "imageIdea": "pomysl na grafike"
        }
      ]
    }
  ],
  "todayCalendar": [
    { "name": "nazwa swieta/rocznicy/dnia", "type": "swieto|rocznica|dzien_tematyczny", "potential": "wysoki|sredni|niski", "idea": "krotki pomysl na post" }
  ],
  "weeklyTrends": [
    { "trend": "nazwa trendu", "platform": "platforma gdzie trenduje", "relevance": "jak branza moze sie podpiac" }
  ],
  "avoidTopics": ["temat do unikniecia 1", "temat do unikniecia 2"],
  "rtmTips": ["wskazowka RTM 1", "wskazowka RTM 2", "wskazowka RTM 3"]
}

Generuj 4-5 okazji RTM. Baz sie na wiedzy o aktualnych trendach w Polsce i na swiecie dla dnia ${today}.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content.map((b: {type:string;text?:string}) => b.type==='text'?b.text:'').join('')
    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad RTM' }, { status: 500 })
  }
}
