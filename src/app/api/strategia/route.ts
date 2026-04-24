import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { robustParse } from '@/lib/parseJSON'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.reason, limit_exceeded: true }, { status: 429 })
  }

  try {
    const { dna, competitors, targetAudience, goals, budget, duration, platforms } = await req.json()
    const brand = String(dna?.brandName || 'Marka').slice(0, 60)
    const ind = String(dna?.industry || 'ogolna').slice(0, 60)
    const tone = String(dna?.tone || 'profesjonalny').slice(0, 100)
    const usp = String(dna?.usp || '').slice(0, 120)
    const persona = String(dna?.persona || targetAudience || '').slice(0, 120)
    const values = String(dna?.values || '').slice(0, 100)
    const plt = Array.isArray(platforms) ? platforms.join(', ') : 'facebook, instagram'
    const dur = String(duration || '3 miesiace')
    const goalsStr = Array.isArray(goals) ? goals.join(', ') : String(goals || 'swiadomosc marki')

    const prompt = `Jestes doswiadczonym strategiem komunikacji w social mediach.

DANE MARKI:
Nazwa: ${brand}
Branza: ${ind}
USP: ${usp}
Ton komunikacji: ${tone}
Persona klienta: ${persona}
Wartosci: ${values}

KONTEKST:
Glowni konkurenci: ${String(competitors || 'brak').slice(0, 150)}
Cele: ${goalsStr}
Budzet miesięczny: ${String(budget || 'nie podano')}
Horyzont: ${dur}
Platformy: ${plt}

Stworz kompleksowa strategie komunikacji social media. Odpowiedz TYLKO czystym JSON:
{
  "executiveSummary": "podsumowanie strategii 3-4 zdania konkretne i mierzalne",
  "brandPosition": {
    "currentState": "obiektywna ocena obecnej pozycji marki",
    "desiredState": "konkretny cel na koniec ${dur}",
    "gap": "glowne dzialania potrzebne do osiagniecia celu",
    "uniqueVoice": "unikalny glos i styl komunikacji marki ${brand}"
  },
  "audienceInsight": {
    "primarySegment": "szczegolowy opis glownego segmentu",
    "painPoints": ["konkretny bol 1", "bol 2", "bol 3"],
    "motivations": ["motywacja do zakupu 1", "motywacja 2"],
    "contentConsumption": "kiedy i jak konsumuje content social media",
    "decisionFactors": ["czynnik decyzji 1", "czynnik 2"]
  },
  "competitiveAnalysis": {
    "marketGaps": ["luka rynkowa 1", "luka 2", "luka 3"],
    "differentiators": ["wyroznik vs konkurencja 1", "wyroznik 2"],
    "competitorWeaknesses": "co konkurencja robi zle lub pomija"
  },
  "contentStrategy": {
    "pillars": [
      {"name": "Filar 1", "description": "szczegolowy opis filaru", "percentage": 30, "examples": ["przyklad posta 1", "przyklad 2"]},
      {"name": "Filar 2", "description": "opis", "percentage": 25, "examples": ["przyklad"]},
      {"name": "Filar 3", "description": "opis", "percentage": 25, "examples": ["przyklad"]},
      {"name": "Filar 4", "description": "opis", "percentage": 20, "examples": ["przyklad"]}
    ],
    "toneGuidelines": ["zasada tonu 1", "zasada 2", "zasada 3", "zasada 4"],
    "doList": ["co robic 1", "co robic 2", "co robic 3", "co robic 4"],
    "dontList": ["czego nie robic 1", "czego nie robic 2", "czego nie robic 3"]
  },
  "platformStrategy": [
    {
      "platform": "pierwsza platforma",
      "role": "rola tej platformy w strategii",
      "frequency": "ile razy w tygodniu",
      "bestFormats": ["format 1", "format 2", "format 3"],
      "bestTimes": "najlepsze godziny i dni",
      "kpi": "glowny KPI",
      "contentMix": "proporcje typow tresci"
    }
  ],
  "contentCalendar": {
    "weeklyRhythm": "szczegolowy rytm tygodniowy co kiedy publikowac",
    "monthlyThemes": ["temat miesiaca 1", "temat 2", "temat 3"],
    "keyDates": ["wazna data 1", "data 2", "data 3"],
    "campaignIdeas": [
      {"name": "Kampania 1", "concept": "szczegolowy opis konceptu kampanii", "timing": "kiedy realizowac"},
      {"name": "Kampania 2", "concept": "opis", "timing": "kiedy"},
      {"name": "Kampania 3", "concept": "opis", "timing": "kiedy"}
    ]
  },
  "kpis": [
    {"metric": "Zasieg organiczny", "target": "konkretna liczba/mies", "timeline": "${dur}", "howToMeasure": "narzedzie"},
    {"metric": "Wskaznik zaangazowania", "target": "procent", "timeline": "${dur}", "howToMeasure": "jak mierzyc"},
    {"metric": "Wzrost obserwujacych", "target": "liczba/mies", "timeline": "${dur}", "howToMeasure": "jak"},
    {"metric": "Konwersje", "target": "liczba leadow/mies", "timeline": "${dur}", "howToMeasure": "UTM + Pixel"}
  ],
  "actionPlan": [
    {"week": "Tydzien 1-2 — Fundament", "actions": ["akcja 1", "akcja 2", "akcja 3", "akcja 4"]},
    {"week": "Tydzien 3-4 — Launch", "actions": ["akcja 1", "akcja 2", "akcja 3"]},
    {"week": "Miesiac 2 — Skalowanie", "actions": ["akcja 1", "akcja 2", "akcja 3"]},
    {"week": "Miesiac 3 — Optymalizacja", "actions": ["akcja 1", "akcja 2", "akcja 3"]}
  ],
  "budget": {
    "organic": "szczegolowy plan dzialan organicznych",
    "paid": "rekomendacja podzialu budzetu na reklamy",
    "tools": ["narzedzie 1 — do czego", "narzedzie 2", "narzedzie 3", "narzedzie 4"]
  },
  "hashtags": {
    "brand": ["#hashtag_marki_1", "#hashtag_marki_2"],
    "industry": ["#branzowy1", "#branzowy2", "#branzowy3", "#branzowy4"],
    "campaign": "#unikalny_hashtag_kampanii"
  }
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })

  } catch (err) {
    console.error('Strategia error:', err instanceof Error ? err.message : err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad strategii'
    }, { status: 500 })
  }
}
