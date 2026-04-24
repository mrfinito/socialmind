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
    const brand = String(dna?.brandName || 'Marka').slice(0, 50)
    const ind = String(dna?.industry || 'ogolna').slice(0, 50)
    const tone = String(dna?.tone || 'profesjonalny').slice(0, 80)
    const usp = String(dna?.usp || '').slice(0, 100)
    const persona = String(dna?.persona || targetAudience || '').slice(0, 100)
    const plt = Array.isArray(platforms) ? platforms.slice(0, 2).join(', ') : 'facebook'
    const dur = String(duration || '3 miesiace')
    const goalsStr = Array.isArray(goals) ? goals.slice(0, 3).join(', ') : 'swiadomosc marki'

    const prompt = `Strateg social media. Stworz strategie dla marki ${brand}.
Branza: ${ind}. Ton: ${tone}. USP: ${usp}. Persona: ${persona}.
Konkurenci: ${String(competitors || 'brak').slice(0, 80)}.
Cele: ${goalsStr}. Budzet: ${String(budget || 'sredni')}. Horyzont: ${dur}. Platformy: ${plt}.

Odpowiedz TYLKO JSON bez markdown:
{
  "executiveSummary": "podsumowanie 2-3 zdania",
  "brandPosition": {"currentState": "obecna pozycja", "desiredState": "cel za ${dur}", "gap": "co zrobic", "uniqueVoice": "unikalny glos"},
  "audienceInsight": {"primarySegment": "opis", "painPoints": ["bol 1","bol 2","bol 3"], "motivations": ["mot 1","mot 2"], "contentConsumption": "kiedy i jak", "decisionFactors": ["czynnik 1","czynnik 2"]},
  "competitiveAnalysis": {"marketGaps": ["luka 1","luka 2","luka 3"], "differentiators": ["wyroznik 1","wyroznik 2"], "competitorWeaknesses": "co robi zle"},
  "contentStrategy": {
    "pillars": [
      {"name": "Filar 1", "description": "opis", "percentage": 30, "examples": ["przyklad 1","przyklad 2"]},
      {"name": "Filar 2", "description": "opis", "percentage": 25, "examples": ["przyklad"]},
      {"name": "Filar 3", "description": "opis", "percentage": 25, "examples": ["przyklad"]},
      {"name": "Filar 4", "description": "opis", "percentage": 20, "examples": ["przyklad"]}
    ],
    "toneGuidelines": ["zasada 1","zasada 2","zasada 3"],
    "doList": ["robic 1","robic 2","robic 3"],
    "dontList": ["nie robic 1","nie robic 2"]
  },
  "platformStrategy": [{"platform": "${plt.split(',')[0].trim()}", "role": "rola", "frequency": "3x tyg", "bestFormats": ["format 1","format 2"], "bestTimes": "18-20", "kpi": "zasieg", "contentMix": "60edu 40promo"}],
  "contentCalendar": {
    "weeklyRhythm": "rytm tygodniowy",
    "monthlyThemes": ["temat 1","temat 2","temat 3"],
    "keyDates": ["data 1","data 2"],
    "campaignIdeas": [{"name": "Kampania 1", "concept": "opis", "timing": "miesiac 1"},{"name": "Kampania 2", "concept": "opis", "timing": "miesiac 2"}]
  },
  "kpis": [
    {"metric": "Zasieg", "target": "liczba/mies", "timeline": "${dur}", "howToMeasure": "Meta Analytics"},
    {"metric": "Zaangazowanie", "target": "procent", "timeline": "${dur}", "howToMeasure": "srednia na post"},
    {"metric": "Obserwujacy", "target": "wzrost/mies", "timeline": "${dur}", "howToMeasure": "Insights"}
  ],
  "actionPlan": [
    {"week": "Tydzien 1-2", "actions": ["akcja 1","akcja 2","akcja 3"]},
    {"week": "Tydzien 3-4", "actions": ["akcja 1","akcja 2"]},
    {"week": "Miesiac 2", "actions": ["akcja 1","akcja 2"]},
    {"week": "Miesiac 3", "actions": ["akcja 1","akcja 2"]}
  ],
  "budget": {"organic": "plan organiczny", "paid": "podzial budzetu", "tools": ["Canva","Meta Business Suite","SocialMind"]},
  "hashtags": {"brand": ["#brand1","#brand2"], "industry": ["#branza1","#branza2","#branza3"], "campaign": "#hashtagKampanii"}
}`

    // Use streaming to avoid timeout
    let fullText = ''
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullText += chunk.delta.text
      }
    }

    console.log('Strategia fullText length:', fullText.length, 'first80:', fullText.slice(0,80), 'last80:', fullText.slice(-80))
    const parsed = robustParse(fullText)
    return NextResponse.json({ ok: true, data: parsed })

  } catch (err) {
    console.error('Strategia error:', err instanceof Error ? err.message : err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad strategii'
    }, { status: 500 })
  }
}
