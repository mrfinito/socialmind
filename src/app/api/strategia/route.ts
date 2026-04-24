import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { robustParse } from '@/lib/parseJSON'
import { checkGenerationLimit } from '@/lib/checkLimits'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })


export async function POST(req: NextRequest) {
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.reason, limit_exceeded: true }, { status: 429 })
  }

  try {
    const { dna, competitors, targetAudience, goals, budget, duration, platforms } = await req.json()
    const brand = String(dna?.brandName || 'Marka').slice(0, 50)
    const ind = String(dna?.industry || 'ogolna').slice(0, 50)
    const tone = String(dna?.tone || 'profesjonalny').slice(0, 80)
    const usp = String(dna?.usp || '').slice(0, 80)
    const persona = String(dna?.persona || targetAudience || '').slice(0, 80)
    const plt = Array.isArray(platforms) ? platforms[0] : 'facebook'
    const dur = String(duration || '3 miesiace')
    const goalsStr = Array.isArray(goals) ? goals.join(', ') : String(goals || 'swiadomosc marki')
    const pltsStr = Array.isArray(platforms) ? platforms.join(', ') : String(platforms || 'facebook, instagram')

    const prompt = `Jestes doswiadczonym strategiem social media.
Stworz kompleksowa strategie komunikacji.

Dane:
- Marka: ${brand}
- Branza: ${ind}
- Ton komunikacji: ${tone}
- USP: ${usp}
- Persona klienta: ${persona}
- Konkurenci: ${String(competitors || 'brak').slice(0, 80)}
- Cele: ${goalsStr}
- Budzet: ${String(budget || 'sredni')}
- Horyzont: ${dur}
- Platformy: ${pltsStr}

Odpowiedz TYLKO jako czysty JSON. Struktura:
{
  "executiveSummary": "podsumowanie 2-3 zdania",
  "brandPosition": {
    "currentState": "obecna pozycja",
    "desiredState": "cel docelowy",
    "gap": "co trzeba zrobic",
    "uniqueVoice": "unikalny glos marki"
  },
  "audienceInsight": {
    "primarySegment": "opis segmentu",
    "painPoints": ["bol 1", "bol 2", "bol 3"],
    "motivations": ["motywacja 1", "motywacja 2"],
    "contentConsumption": "kiedy i jak konsumuje",
    "decisionFactors": ["czynnik 1", "czynnik 2"]
  },
  "competitiveAnalysis": {
    "marketGaps": ["luka 1", "luka 2", "luka 3"],
    "differentiators": ["wyroznik 1", "wyroznik 2"],
    "competitorWeaknesses": "co robi zle"
  },
  "contentStrategy": {
    "pillars": [
      {"name": "Filar 1", "description": "opis", "percentage": 30, "examples": ["przyklad 1", "przyklad 2"]},
      {"name": "Filar 2", "description": "opis", "percentage": 25, "examples": ["przyklad"]},
      {"name": "Filar 3", "description": "opis", "percentage": 25, "examples": ["przyklad"]},
      {"name": "Filar 4", "description": "opis", "percentage": 20, "examples": ["przyklad"]}
    ],
    "toneGuidelines": ["zasada 1", "zasada 2", "zasada 3"],
    "doList": ["robic 1", "robic 2", "robic 3"],
    "dontList": ["nie robic 1", "nie robic 2"]
  },
  "platformStrategy": [
    {"platform": "${plt}", "role": "rola", "frequency": "X razy tygodniowo", "bestFormats": ["format 1", "format 2"], "bestTimes": "godziny", "kpi": "KPI", "contentMix": "proporcje"}
  ],
  "contentCalendar": {
    "weeklyRhythm": "rytm tygodniowy",
    "monthlyThemes": ["temat 1", "temat 2", "temat 3"],
    "keyDates": ["data 1", "data 2"],
    "campaignIdeas": [
      {"name": "Kampania 1", "concept": "opis", "timing": "kiedy"},
      {"name": "Kampania 2", "concept": "opis", "timing": "kiedy"}
    ]
  },
  "kpis": [
    {"metric": "Zasieg", "target": "liczba/mies", "timeline": "${dur}", "howToMeasure": "narzedzie"},
    {"metric": "Zaangazowanie", "target": "procent", "timeline": "${dur}", "howToMeasure": "jak"},
    {"metric": "Obserwujacy", "target": "wzrost/mies", "timeline": "${dur}", "howToMeasure": "jak"}
  ],
  "actionPlan": [
    {"week": "Tydzien 1-2", "actions": ["akcja 1", "akcja 2", "akcja 3"]},
    {"week": "Tydzien 3-4", "actions": ["akcja 1", "akcja 2"]},
    {"week": "Miesiac 2", "actions": ["akcja 1", "akcja 2"]},
    {"week": "Miesiac 3", "actions": ["akcja 1", "akcja 2"]}
  ],
  "budget": {
    "organic": "plan organiczny",
    "paid": "podzial budzetu",
    "tools": ["narzedzie 1", "narzedzie 2", "narzedzie 3"]
  },
  "hashtags": {
    "brand": ["#brand1", "#brand2"],
    "industry": ["#branza1", "#branza2", "#branza3"],
    "campaign": "#hashtagKampanii"
  }
}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error('Strategia error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad strategii'
    }, { status: 500 })
  }
}
