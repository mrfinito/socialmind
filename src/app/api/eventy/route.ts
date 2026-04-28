import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { repairAIJSON } from '@/lib/repairJSON'
import { checkAnthropicKey, errorResponse, safeJsonBody } from '@/lib/aiGuards'
import { tavilySearch, formatSearchForPrompt } from '@/lib/tavily'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const maxDuration = 300

interface DNA {
  brandName?: string
  industry?: string
  persona?: string
  audience?: string
  values?: string | string[]
  tone?: string
  usp?: string
  keywords?: string
}

const EVENT_TYPES: Record<string, string> = {
  conference: 'Konferencja / kongres branżowy',
  launch: 'Premiera produktu / launch',
  festival: 'Festiwal / koncert / impreza masowa',
  open_day: 'Open day / dzień otwarty firmy',
  fair: 'Targi / wystawa',
  contest: 'Konkurs / promocja sezonowa',
  webinar: 'Webinar / event online',
  workshop: 'Workshop / szkolenie',
  charity: 'Wydarzenie charytatywne / sponsoring',
  other: 'Inne wydarzenie',
}

export async function POST(req: NextRequest) {
  try {
    const keyGuard = checkAnthropicKey()
    if (keyGuard) return keyGuard

    const limit = await checkGenerationLimit()
    if (!limit.allowed) {
      return new Response(JSON.stringify({ error: limit.reason }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const parsed = await safeJsonBody<{
      eventType: string
      eventName?: string
      eventDate?: string
      eventLocation?: string
      audience?: string
      goals?: string
      brief: string  // text content (either typed or extracted from file)
      sourceFile?: string  // optional: name of original file
      dna?: DNA
      useSearch?: boolean
    }>(req)
    if (parsed.response) return parsed.response

    const { eventType, eventName, eventDate, eventLocation, audience, goals, brief, sourceFile, dna, useSearch } = parsed.body

    if (!brief || brief.trim().length < 20) {
      return new Response(JSON.stringify({ error: 'Brief musi mieć co najmniej 20 znaków' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const eventTypeLabel = EVENT_TYPES[eventType] || EVENT_TYPES.other

    // Brand DNA defensive context
    const dnaValuesText = (() => {
      const v = dna?.values
      if (!v) return ''
      return Array.isArray(v) ? v.join(', ') : (typeof v === 'string' ? v.trim() : '')
    })()

    const dnaContext = dna?.brandName ? `
KONTEKST MARKI:
- Marka: ${dna.brandName}
${dna.industry ? `- Branża: ${dna.industry}` : ''}
${dna.usp ? `- USP: ${dna.usp}` : ''}
${dna.tone ? `- Ton komunikacji: ${dna.tone}` : ''}
${dnaValuesText ? `- Wartości: ${dnaValuesText}` : ''}
${dna.persona || dna.audience ? `- Persona: ${dna.persona || dna.audience}` : ''}
${dna.keywords ? `- Słowa kluczowe: ${dna.keywords}` : ''}
` : ''

    // ─── Research event + similar successful events ───
    let eventResearch = ''
    if (useSearch !== false && process.env.TAVILY_API_KEY) {
      try {
        const queries = []
        // If event has a name - search for it directly
        if (eventName) {
          queries.push(tavilySearch(`${eventName} ${eventDate || ''} event`, {
            maxResults: 3, searchDepth: 'basic',
          }))
        }
        // Always: similar successful events for inspiration
        queries.push(tavilySearch(`udane ${eventTypeLabel} pomysl koncept marketing`, {
          maxResults: 4, searchDepth: 'basic',
        }))
        // Industry context
        if (dna?.industry) {
          queries.push(tavilySearch(`event marketing ${dna.industry} trends`, {
            maxResults: 3, searchDepth: 'basic',
          }))
        }
        const results = await Promise.all(queries)
        const all = results.flatMap(r => r?.results || [])
        if (all.length > 0) {
          eventResearch = formatSearchForPrompt(all, { maxPerResult: 400, maxTotal: 3500 })
        }
      } catch (e) {
        console.warn('Eventy: search failed:', e instanceof Error ? e.message : e)
      }
    }

    const systemPrompt = `Jesteś ekspertem od event marketingu z 15+ letnim doświadczeniem w tworzeniu zapadających w pamięć wydarzeń dla marek. Twoje pomysły łączą strategię biznesową z kreatywnym podejściem.

Twoje zadanie:
1. Przeczytaj uważnie brief eventu i kontekst marki
2. Zaproponuj JEDEN GŁÓWNY pomysł kreatywny (concept) - z wyrazistą nazwą, hook'iem i unikalnym kątem
3. Wymyśl 3-5 propozycji grafik/wizuali które wspierają ten koncept

Odpowiadasz WYŁĄCZNIE poprawnym JSON bez żadnego tekstu przed ani po. Nie używaj markdown.

KRYTYCZNE - cudzysłowy w wartościach JSON:
- W tekstach NIE używaj prostych cudzysłowów " - to łamie JSON
- Używaj WYŁĄCZNIE apostrofów ' jako single-quote
- Przykład ZLE: "hook": "To jest "rewolucja" w branży"
- Przykład DOBRZE: "hook": "To jest 'rewolucja' w branży"`

    const prompt = `${dnaContext}

TYP WYDARZENIA: ${eventTypeLabel}
${eventName ? `NAZWA EVENTU: ${eventName}` : ''}
${eventDate ? `DATA: ${eventDate}` : ''}
${eventLocation ? `LOKALIZACJA: ${eventLocation}` : ''}
${audience ? `GRUPA DOCELOWA: ${audience}` : ''}
${goals ? `CELE BIZNESOWE: ${goals}` : ''}

BRIEF EVENTU${sourceFile ? ` (źródło: ${sourceFile})` : ''}:
${brief}
${eventResearch ? `
═══ RESEARCH Z INTERNETU ═══
Wykorzystaj te dane do bardziej trafnego i swieżego konceptu:

${eventResearch}

═════════════════════════════
` : ''}
Wygeneruj kreatywną propozycję event marketingową w formacie JSON:

{
  "concept": {
    "name": "Krótka chwytliwa nazwa konceptu (max 6 słów)",
    "tagline": "Jednolinijkowy slogan/hook (max 80 znaków)",
    "summary": "Opis konceptu w 3-4 zdaniach - co to jest, dlaczego zadziała, co odróżnia",
    "rationale": "Dlaczego ten konkretny pomysł pasuje do marki i celów - 2-3 zdania",
    "keyMessages": [
      "Główny komunikat 1 (do 100 znaków)",
      "Główny komunikat 2",
      "Główny komunikat 3"
    ],
    "atmosphere": "Opis atmosfery/nastroju eventu - 2-3 zdania (kolory, dźwięk, energia, emocje)",
    "uniqueElements": [
      "Element wyróżniający 1 - co zaskoczy uczestników",
      "Element wyróżniający 2",
      "Element wyróżniający 3"
    ]
  },
  "visuals": [
    {
      "title": "Nazwa wizualu (np. 'Hero image - main poster')",
      "purpose": "Do czego ma służyć - max 80 znaków (np. 'Główna komunikacja przed eventem - billboard, social media')",
      "description": "Szczegółowy opis grafiki - co przedstawia, kompozycja, kolory, styl - 2-3 zdania",
      "imagePrompt": "ANGIELSKI prompt dla AI image generator (DALL-E/Gemini) - bardzo szczegółowy opis wizualny, styl, kolory, elementy. Min 50 słów.",
      "format": "Sugerowany format/rozmiar (np. '1:1 square Instagram', '16:9 banner', '9:16 story')",
      "platform": "Gdzie używać (np. 'Instagram, Facebook, billboard outdoor')"
    }
    // 3-5 elementów
  ],
  "executionNotes": [
    "Wskazówka praktyczna 1 dla zespołu kreatywnego",
    "Wskazówka praktyczna 2",
    "Wskazówka praktyczna 3"
  ]
}

Wygeneruj 4 wizuale jeśli brief wystarczająco bogaty, lub 3 jeśli zwięzły, max 5 jeśli bardzo szczegółowy.

PAMIĘTAJ:
- imagePrompt ZAWSZE po angielsku (modele AI lepiej rozumieją)
- Pozostałe pola po POLSKU
- Apostrofy ' zamiast cudzysłowów " w wartościach`

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let sentDone = false

        function send(data: object) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          const aiStream = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 8000,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
            stream: true,
          })

          let fullText = ''
          for await (const event of aiStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text
              send({ chunk: event.delta.text })
            }
          }

          // Try to parse JSON
          const { parsed: result, strategy } = repairAIJSON(fullText)
          if (result) {
            console.log('Eventy parsed via:', strategy)
            send({ done: true, data: result })
            sentDone = true
          } else {
            console.error('Eventy parse failed. Raw len:', fullText.length)
            console.error('Last 500 chars:', fullText.slice(-500))
            send({ error: 'Nie można sparsować odpowiedzi AI. Spróbuj ponownie.' })
            sentDone = true
          }
        } catch (err) {
          console.error('Eventy stream error:', err)
          const msg = err instanceof Error ? err.message : 'Unknown error'
          send({ error: `Błąd generowania: ${msg}` })
          sentDone = true
        } finally {
          if (!sentDone) send({ error: 'Stream zakończony bez wyniku' })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    return errorResponse(err, 'Eventy route error')
  }
}
