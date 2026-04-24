import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return new Response(
      JSON.stringify({ error: limitCheck.reason }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { dna, competitors, targetAudience, goals, budget, duration, platforms } = await req.json()
  const brand = String(dna?.brandName || 'Marka').slice(0, 50)
  const ind = String(dna?.industry || 'ogolna').slice(0, 50)
  const tone = String(dna?.tone || 'profesjonalny').slice(0, 80)
  const usp = String(dna?.usp || '').slice(0, 100)
  const persona = String(dna?.persona || targetAudience || '').slice(0, 100)
  const plt = Array.isArray(platforms) ? platforms.join(', ') : 'facebook, instagram'
  const dur = String(duration || '3 miesiace')
  const goalsStr = Array.isArray(goals) ? goals.join(', ') : 'swiadomosc marki'

  const prompt = `Jestes doswiadczonym strategiem social media. Stworz kompleksowa strategie komunikacji.

Marka: ${brand} | Branza: ${ind} | Ton: ${tone} | USP: ${usp} | Persona: ${persona}
Konkurenci: ${String(competitors||'brak').slice(0,100)} | Cele: ${goalsStr}
Budzet: ${String(budget||'sredni')} | Horyzont: ${dur} | Platformy: ${plt}

Odpowiedz TYLKO czystym JSON bez markdown:
{
  "executiveSummary": "podsumowanie 3 zdania",
  "brandPosition": {"currentState": "obecna pozycja", "desiredState": "cel za ${dur}", "gap": "co zrobic", "uniqueVoice": "unikalny glos"},
  "audienceInsight": {"primarySegment": "opis segmentu", "painPoints": ["bol 1", "bol 2", "bol 3"], "motivations": ["mot 1", "mot 2"], "contentConsumption": "kiedy i jak", "decisionFactors": ["czynnik 1", "czynnik 2"]},
  "competitiveAnalysis": {"marketGaps": ["luka 1", "luka 2", "luka 3"], "differentiators": ["wyroznik 1", "wyroznik 2"], "competitorWeaknesses": "co robi zle"},
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
  "platformStrategy": [{"platform": "facebook", "role": "rola", "frequency": "X razy tyg", "bestFormats": ["format 1", "format 2"], "bestTimes": "godziny", "kpi": "KPI", "contentMix": "proporcje"}],
  "contentCalendar": {"weeklyRhythm": "rytm tygodniowy", "monthlyThemes": ["temat 1", "temat 2", "temat 3"], "keyDates": ["data 1", "data 2"], "campaignIdeas": [{"name": "Kampania 1", "concept": "opis", "timing": "kiedy"}, {"name": "Kampania 2", "concept": "opis", "timing": "kiedy"}]},
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
  "budget": {"organic": "plan organiczny", "paid": "podzial budzetu", "tools": ["narzedzie 1", "narzedzie 2", "narzedzie 3"]},
  "hashtags": {"brand": ["#brand1", "#brand2"], "industry": ["#branza1", "#branza2", "#branza3"], "campaign": "#kampania"}
}`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {}
      }

      let fullText = ''
      let sentDone = false

      try {
        const anthropicStream = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          stream: true,
          messages: [{ role: 'user', content: prompt }]
        })

        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullText += event.delta.text
            send({ chunk: event.delta.text })
          }
        }

        // Try to parse the accumulated text
        console.log('Strategia stream finished, length:', fullText.length)
        const start = fullText.indexOf('{')
        const end = fullText.lastIndexOf('}')
        
        if (start === -1 || end === -1) {
          send({ error: 'Brak JSON w odpowiedzi AI' })
          sentDone = true
        } else {
          let clean = fullText.slice(start, end + 1)
          
          let parsed = null
          try {
            parsed = JSON.parse(clean)
          } catch {
            // Fix newlines in string values
            clean = clean.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, (m) =>
              m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
            )
            try {
              parsed = JSON.parse(clean)
            } catch {
              clean = clean.replace(/,(\s*[}\]])/g, '$1')
              try { parsed = JSON.parse(clean) } catch {}
            }
          }
          
          if (parsed) {
            console.log('Strategia parsed OK')
            send({ done: true, data: parsed })
          } else {
            console.error('Strategia parse failed')
            send({ error: 'Nie mozna przetworzyc JSON' })
          }
          sentDone = true
        }
      } catch (err) {
        console.error('Strategia stream error:', err)
        send({ error: err instanceof Error ? err.message : 'Blad strumienia' })
        sentDone = true
      }
      
      // Safety: if nothing was sent, send error
      if (!sentDone) {
        send({ error: 'Stream zakonczony bez wyniku' })
      }
      
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    }
  })
}
