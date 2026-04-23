import { NextRequest, NextResponse } from 'next/server'
import { checkGenerationLimit } from '@/lib/checkLimits'
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
  // Check generation limit
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return NextResponse.json({
      error: limitCheck.reason || 'Przekroczono limit generowania',
      limit_exceeded: true,
      used: limitCheck.used,
      limit: limitCheck.limit,
    }, { status: 429 })
  }

    const { industry, product, targetDesc, masterPrompt, brandName } = await req.json()

    const prompt = `Jesteś ekspertem od strategii marketingowej i psychologii konsumenta.

Stwórz 3 szczegółowe persony klientów dla marki:
Marka: ${brandName || 'Marka'}
Branża: ${industry || 'ogólna'}
Produkt/usługa: ${product || 'produkt'}
Opis grupy docelowej: ${targetDesc || 'ogólna grupa docelowa'}
${masterPrompt ? `Kontekst marki: ${masterPrompt.slice(0, 300)}` : ''}

Każda persona powinna być BARDZO konkretna i żywa — jak prawdziwa osoba.

Odpowiedz TYLKO w JSON (bez markdown):
{
  "personas": [
    {
      "id": "persona-1",
      "name": "imię i nazwisko",
      "age": 34,
      "gender": "kobieta|mężczyzna",
      "location": "miasto, region",
      "occupation": "zawód i stanowisko",
      "income": "przedział dochodów",
      "education": "wykształcenie",
      "familyStatus": "stan cywilny, dzieci",
      "photo": "opis jak wygląda (do generowania avatara)",
      "quote": "zdanie które ona/on mogłaby powiedzieć o swoim życiu",
      "personality": {
        "traits": ["cecha 1", "cecha 2", "cecha 3"],
        "values": ["wartość 1", "wartość 2"],
        "lifestyle": "opis stylu życia (2-3 zdania)"
      },
      "goals": {
        "primary": "główny cel życiowy/zawodowy",
        "secondary": ["cel 2", "cel 3"],
        "dreamOutcome": "wymarzone życie za 5 lat"
      },
      "painPoints": {
        "primary": "największy problem/frustracja",
        "daily": ["codzienne wyzwanie 1", "codzienne wyzwanie 2"],
        "fears": ["obawa 1", "obawa 2"]
      },
      "digitalBehavior": {
        "platforms": ["instagram", "facebook"],
        "timeOnline": "np. 2-3 godziny dziennie, głównie wieczorem",
        "contentType": "jakiego contentu szuka i konsumuje",
        "influencers": "kogo obserwuje, jakie źródła ufa",
        "buyingBehavior": "jak podejmuje decyzje zakupowe online"
      },
      "relationshipWithBrand": {
        "awareness": "jak dowiedziała się o marce",
        "trigger": "co skłoniło do pierwszego zakupu/kontaktu",
        "objections": ["obiekcja 1", "obiekcja 2"],
        "loyaltyDrivers": ["co zatrzymuje ją jako klienta"]
      },
      "communicationStyle": {
        "language": "jakim językiem mówi (formalny/nieformalny, emoji tak/nie)",
        "triggers": ["słowo/fraza które ją przyciąga 1", "słowo/fraza 2"],
        "avoids": ["czego nie lubi w komunikacji marek"],
        "bestHook": "przykładowe zdanie które ją zatrzyma na scrollowaniu"
      },
      "contentIdeas": [
        { "topic": "temat posta idealny dla tej persony", "format": "karuzela|reel|post", "reason": "dlaczego zadziała" }
      ]
    }
  ],
  "audienceInsights": {
    "commonTraits": ["cecha wspólna 1", "cecha wspólna 2", "cecha wspólna 3"],
    "segmentStrategy": "jak komunikować się z każdym segmentem",
    "priorityPersona": "persona-1",
    "priorityReason": "dlaczego ta persona jest najważniejsza",
    "messagingFramework": "ogólna zasada komunikacji do całej grupy"
  },
  "contentStrategy": {
    "tone": "rekomendowany ton dla tej grupy",
    "formats": ["najlepszy format 1", "format 2"],
    "topics": ["temat contentu 1", "temat 2", "temat 3"],
    "avoid": ["czego unikać w komunikacji"]
  }
}`

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = response.content.map((b: {type: string; text?: string}) => (b.type === 'text' ? b.text : '')).join('')
    const parsed = robustParse(rawText)

    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Błąd generowania persony' }, { status: 500 })
  }
}
