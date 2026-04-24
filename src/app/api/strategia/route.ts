import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { robustParse } from '@/lib/parseJSON'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.reason, limit_exceeded: true }, { status: 429 })
  }

  try {
    const { dna, competitors, targetAudience, goals, budget, duration, platforms } = await req.json()
    const brand = String(dna?.brandName || 'Marka').slice(0, 40)
    const ind = String(dna?.industry || 'ogolna').slice(0, 40)
    const tone = String(dna?.tone || 'profesjonalny').slice(0, 60)
    const persona = String(dna?.persona || targetAudience || '').slice(0, 60)
    const plt = Array.isArray(platforms) ? platforms.slice(0, 2).join(', ') : 'facebook'
    const dur = String(duration || '3 miesiace')
    const goalsStr = Array.isArray(goals) ? goals.slice(0, 3).join(', ') : 'swiadomosc marki'

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1800,
      system: 'Jestes strategiem social media. Odpowiadasz TYLKO czystym JSON bez markdown.',
      messages: [{
        role: 'user',
        content: `Stworz strategie dla: ${brand}, ${ind}, ton: ${tone}, persona: ${persona}, konkurenci: ${String(competitors||'brak').slice(0,40)}, cele: ${goalsStr}, budzet: ${String(budget||'sredni')}, ${dur}, platformy: ${plt}.

Wygeneruj JSON:
{
  "executiveSummary": "podsumowanie 2 zdania",
  "brandPosition": {
    "currentState": "obecna pozycja marki",
    "desiredState": "cel za ${dur}",
    "gap": "co zrobic",
    "uniqueVoice": "unikalny glos"
  },
  "audienceInsight": {
    "primarySegment": "opis segmentu",
    "painPoints": ["bol 1", "bol 2", "bol 3"],
    "motivations": ["motywacja 1", "motywacja 2"],
    "contentConsumption": "kiedy konsumuje",
    "decisionFactors": ["czynnik 1", "czynnik 2"]
  },
  "competitiveAnalysis": {
    "marketGaps": ["luka 1", "luka 2"],
    "differentiators": ["wyroznik 1", "wyroznik 2"],
    "competitorWeaknesses": "co robi zle"
  },
  "contentStrategy": {
    "pillars": [
      {"name": "Filar 1", "description": "opis", "percentage": 30, "examples": ["przyklad"]},
      {"name": "Filar 2", "description": "opis", "percentage": 25, "examples": ["przyklad"]},
      {"name": "Filar 3", "description": "opis", "percentage": 25, "examples": ["przyklad"]},
      {"name": "Filar 4", "description": "opis", "percentage": 20, "examples": ["przyklad"]}
    ],
    "toneGuidelines": ["zasada 1", "zasada 2"],
    "doList": ["robic 1", "robic 2", "robic 3"],
    "dontList": ["nie robic 1", "nie robic 2"]
  },
  "platformStrategy": [
    {"platform": "${plt.split(',')[0].trim()}", "role": "rola", "frequency": "3x tyg", "bestFormats": ["post", "video"], "bestTimes": "18-20", "kpi": "zasieg", "contentMix": "60edu 40promo"}
  ],
  "contentCalendar": {
    "weeklyRhythm": "pon edu, sro zaangazowanie, pt sprzedaz",
    "monthlyThemes": ["temat 1", "temat 2", "temat 3"],
    "keyDates": ["data 1", "data 2"],
    "campaignIdeas": [
      {"name": "Kampania 1", "concept": "opis", "timing": "miesiac 1"},
      {"name": "Kampania 2", "concept": "opis", "timing": "miesiac 2"}
    ]
  },
  "kpis": [
    {"metric": "Zasieg", "target": "5000/mies", "timeline": "${dur}", "howToMeasure": "Meta Analytics"},
    {"metric": "Zaangazowanie", "target": "3%", "timeline": "${dur}", "howToMeasure": "srednia na post"},
    {"metric": "Obserwujacy", "target": "+200/mies", "timeline": "${dur}", "howToMeasure": "Instagram Insights"}
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
    "tools": ["Canva", "Meta Business Suite", "SocialMind"]
  },
  "hashtags": {
    "brand": ["#brand1", "#brand2"],
    "industry": ["#branza1", "#branza2", "#branza3"],
    "campaign": "#kampania"
  }
}`
      }]
    })

    const raw = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    console.log('Strategia raw first 80:', raw.slice(0, 80))

    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })

  } catch (err) {
    console.error('Strategia error:', err instanceof Error ? err.message : err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad strategii'
    }, { status: 500 })
  }
}
