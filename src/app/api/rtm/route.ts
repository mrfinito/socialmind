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
    const brand = (dna?.brandName || 'Marka').replace(/['"]/g, '')
    const ind = (industry || dna?.industry || 'ogolna').replace(/['"]/g, '')
    const tone = (dna?.tone || 'profesjonalny').replace(/['"]/g, '')
    const persona = (dna?.persona || '').replace(/['"]/g, '').slice(0, 150)
    const usp = (dna?.usp || '').replace(/['"]/g, '').slice(0, 150)

    const prompt = `Jestes ekspertem od Real Time Marketingu z 15-letnim doswiadczeniem w polskim rynku reklamowym.

Dzisiaj jest: ${today}
Marka: ${brand}
Branza: ${ind}
Ton komunikacji: ${tone}
Persona klienta: ${persona}
USP marki: ${usp}
Platformy: ${(platforms||['facebook','instagram']).join(', ')}
Kraj: ${country || 'Polska'}

TWOJE ZADANIE:
1. Na podstawie swojej wiedzy o aktualnych wydarzeniach, trendach i swietach w Polsce i na swiecie (na dzien ${today}) zidentyfikuj 4-5 konkretnych okazji RTM
2. Dla kazdej okazji oceń dopasowanie do marki ${brand} i wygeneruj gotowe, profesjonalne posty
3. Pamietaj o specyfice polskiego rynku, kulturze i aktualnych dyskusjach spolecznych

ZASADY RTM:
- Post musi byc autentyczny — marka nie moze sie na sile podpinac pod temat
- Unikaj tematow politycznych, tragicznych wypadkow, chorob
- Szukaj pozytywnych, zabawnych lub inspirujacych polaczen
- Hook musi zatrzymac scrollowanie w ciagu 2 sekund
- Hashtagi musza byc aktualne i popularne

Odpowiedz TYLKO czystym JSON bez zadnego tekstu przed lub po:

{
  "date": "${today}",
  "opportunities": [
    {
      "id": "opp1",
      "title": "konkretna nazwa wydarzenia/trendu/swieta",
      "category": "sport|kultura|technologia|swieto|trend|news|meme|biznes",
      "relevance": "wysokie|srednie|niskie",
      "why": "konkretne wyjasnienie dlaczego ten temat pasuje do marki ${brand} i jej grupy docelowej",
      "risk": "ewentualne ryzyko wizerunkowe lub brak",
      "urgency": "dzisiaj|ten tydzien|ten miesiac",
      "posts": [
        {
          "platform": "facebook",
          "angle": "kreatywny koncept podpiecia marki pod temat — co jest lacznikiem miedzy tematem a marka",
          "text": "pelny, gotowy tekst posta napisany w tonie ${tone}. Minimum 150 slow. Naturalny, angażujacy, z CTA",
          "hook": "pierwsze 1-2 zdania ktore zatrzymuja scrollowanie",
          "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
          "imageIdea": "szczegolowy opis grafiki lub wideo ktore pasuje do posta"
        },
        {
          "platform": "instagram",
          "angle": "koncept dla Instagram — bardziej wizualny i emocjonalny",
          "text": "caption dla Instagram z emoji, storytellingiem, do 2200 znakow",
          "hook": "pierwsze zdanie + emoji",
          "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5", "#hashtag6", "#hashtag7"],
          "imageIdea": "pomysl na grafike lub reel"
        }
      ]
    }
  ],
  "todayCalendar": [
    {
      "name": "nazwa swieta/rocznicy/dnia tematycznego",
      "type": "swieto_panstwowe|dzien_tematyczny|rocznica|wydarzenie",
      "potential": "wysoki|sredni|niski",
      "idea": "konkretny pomysl jak marka ${brand} moze to wykorzystac"
    }
  ],
  "weeklyTrends": [
    {
      "trend": "nazwa trendu lub hashtagu ktory trenduje",
      "platform": "na jakiej platformie trenduje",
      "relevance": "jak konkretnie branza ${ind} moze sie pod to podpiac"
    }
  ],
  "avoidTopics": [
    "konkretny temat do unikniecia dzis z krotkim wyjasnieniem dlaczego"
  ],
  "rtmTips": [
    "konkretna wskazowka RTM na dzis dostosowana do marki ${brand}"
  ]
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
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
