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
  throw new Error('Nie mozna przetworzyc odpowiedzi AI')
}

export async function POST(req: NextRequest) {
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.reason, limit_exceeded: true }, { status: 429 })
  }

  try {
    const { dna, competitors, targetAudience, goals, budget, duration, platforms } = await req.json()

    const prompt = `Jestes ekspertem od strategii komunikacji w social mediach. 
Stworz pelna strategie komunikacji dla marki.

DANE MARKI:
Nazwa: ${dna?.brandName || 'Marka'}
Branza: ${dna?.industry || 'ogolna'}
USP: ${dna?.usp || ''}
Ton: ${dna?.tone || 'profesjonalny'}
Persona klienta: ${dna?.persona || ''}
Wartosci: ${dna?.values || ''}

KONTEKST:
Konkurenci: ${competitors || 'brak danych'}
Grupa docelowa: ${targetAudience || dna?.persona || ''}
Cele biznesowe: ${(goals || []).join(', ') || 'swiadomosc marki, sprzedaz'}
Budzet: ${budget || 'nieokreslony'}
Horyzont czasowy: ${duration || '3 miesiace'}
Platformy: ${(platforms || ['facebook','instagram']).join(', ')}

Odpowiedz TYLKO czystym JSON:
{
  "executiveSummary": "krotkie podsumowanie strategii (3-4 zdania)",
  "brandPosition": {
    "currentState": "obecna pozycja marki na rynku",
    "desiredState": "pozadana pozycja za ${duration || '3 miesiace'}",
    "gap": "co trzeba zrobic zeby przejsc z A do B",
    "uniqueVoice": "unikalny glos i styl komunikacji tej marki"
  },
  "audienceInsight": {
    "primarySegment": "glowny segment odbiorcy",
    "painPoints": ["bol 1", "bol 2", "bol 3"],
    "motivations": ["motywacja 1", "motywacja 2"],
    "contentConsumption": "kiedy i jak konsumuje content",
    "decisionFactors": ["czynnik 1", "czynnik 2"]
  },
  "competitiveAnalysis": {
    "marketGaps": ["luka 1", "luka 2", "luka 3"],
    "differentiators": ["wyroznik 1", "wyroznik 2"],
    "competitorWeaknesses": "co konkurencja robi zle"
  },
  "contentStrategy": {
    "pillars": [
      { "name": "Filar 1", "description": "opis", "percentage": 30, "examples": ["przyklad 1", "przyklad 2"] },
      { "name": "Filar 2", "description": "opis", "percentage": 25, "examples": ["przyklad 1", "przyklad 2"] },
      { "name": "Filar 3", "description": "opis", "percentage": 25, "examples": ["przyklad 1", "przyklad 2"] },
      { "name": "Filar 4", "description": "opis", "percentage": 20, "examples": ["przyklad 1", "przyklad 2"] }
    ],
    "toneGuidelines": ["zasada tonu 1", "zasada 2", "zasada 3"],
    "doList": ["co robic 1", "co robic 2", "co robic 3"],
    "dontList": ["czego nie robic 1", "czego nie robic 2"]
  },
  "platformStrategy": [
    {
      "platform": "facebook",
      "role": "rola tej platformy w strategii",
      "frequency": "X razy w tygodniu",
      "bestFormats": ["format 1", "format 2"],
      "bestTimes": "najlepsze godziny publikacji",
      "kpi": "glowny KPI dla tej platformy",
      "contentMix": "jak rozdzielic typy tresci"
    }
  ],
  "contentCalendar": {
    "weeklyRhythm": "rytm tygodniowy (np. pon edukacja, sr zaangazowanie, pt sprzedaz)",
    "monthlyThemes": ["temat miesiaca 1", "temat miesiaca 2", "temat miesiaca 3"],
    "keyDates": ["wazna data 1", "wazna data 2"],
    "campaignIdeas": [
      { "name": "Kampania 1", "concept": "krotki opis", "timing": "kiedy" },
      { "name": "Kampania 2", "concept": "krotki opis", "timing": "kiedy" }
    ]
  },
  "kpis": [
    { "metric": "zasieg organiczny", "target": "X/mies.", "timeline": "3 miesiace", "howToMeasure": "opis" },
    { "metric": "zaangazowanie", "target": "X%", "timeline": "3 miesiace", "howToMeasure": "opis" },
    { "metric": "konwersje", "target": "X/mies.", "timeline": "3 miesiace", "howToMeasure": "opis" }
  ],
  "actionPlan": [
    { "week": "Tydzien 1-2", "actions": ["akcja 1", "akcja 2", "akcja 3"] },
    { "week": "Tydzien 3-4", "actions": ["akcja 1", "akcja 2"] },
    { "week": "Miesiac 2", "actions": ["akcja 1", "akcja 2"] },
    { "week": "Miesiac 3", "actions": ["akcja 1", "akcja 2"] }
  ],
  "budget": {
    "organic": "plan dzialan organicznych",
    "paid": "rekomendowany budzet reklamowy i jak go rozdzielic",
    "tools": ["narzedzie 1", "narzedzie 2"]
  },
  "hashtags": {
    "brand": ["#brandowy1", "#brandowy2"],
    "industry": ["#branzowy1", "#branzowy2", "#branzowy3"],
    "campaign": "#hashtagKampanijny"
  }
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
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad generowania strategii' }, { status: 500 })
  }
}
