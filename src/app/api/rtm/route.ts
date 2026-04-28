import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { repairAIJSON } from '@/lib/repairJSON'
import { checkAnthropicKey } from '@/lib/aiGuards'
import { tavilySearch, formatSearchForPrompt } from '@/lib/tavily'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const _envGuard = checkAnthropicKey()
  if (_envGuard) return _envGuard

  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return new Response(JSON.stringify({ error: limitCheck.reason }), {
      status: 429, headers: { 'Content-Type': 'application/json' }
    })
  }

  const { dna, industry, platforms, country, useSearch} = await req.json()
  const today = new Date().toLocaleDateString('pl', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  const brand = String(dna?.brandName || 'Marka')
  const ind = String(industry || dna?.industry || 'ogolna')
  const tone = String(dna?.tone || 'profesjonalny')
  const persona = String(dna?.persona || 'brak')
  const usp = String(dna?.usp || 'brak')
  const plt = Array.isArray(platforms) ? platforms.join(', ') : 'facebook, instagram'
  const ctry = String(country || 'Polska')

  // ─── NEW: Fetch fresh news from Tavily for richer RTM context ───
  let freshNewsContext = ''
  if (useSearch !== false && process.env.TAVILY_API_KEY) {
    try {
      const [news, trends] = await Promise.all([
        tavilySearch(`najwazniejsze wydarzenia ${ctry} dzisiaj`, {
          topic: 'news', maxResults: 5, days: 2,
        }),
        tavilySearch(`trendy social media ${ind} ${ctry}`, {
          topic: 'general', maxResults: 4,
        }),
      ])
      const allResults = [
        ...(news?.results || []),
        ...(trends?.results || []),
      ]
      if (allResults.length > 0) {
        freshNewsContext = formatSearchForPrompt(allResults, { maxPerResult: 400, maxTotal: 3500 })
      }
    } catch (e) {
      console.warn('RTM: Tavily fetch failed:', e instanceof Error ? e.message : e)
    }
  }

  const systemPrompt = `Jestes ekspertem Real Time Marketingu z 10-letnim doswiadczeniem w polskim rynku reklamowym. Znasz polska kulture, aktualne trendy, swieta i rocznice, dyskusje spoleczne.

Twoja praca to:
1. Wychwycanie aktualnych wydarzen, trendow, swiat i newsow ktore marka moze komunikacyjnie wykorzystac
2. Tworzenie autentycznych, zabawnych lub inspirujacych polaczen miedzy tematem a marka
3. Pisanie profesjonalnych postow social media ktore zatrzymuja scrollowanie

ZASADY RTM:
- Autentycznosc ponad wszystko - marka nie moze sie na sile podpinac
- Unikaj tematow politycznych, tragicznych wypadkow, chorob
- Szukaj pozytywnych, zabawnych polaczen
- Hook musi zatrzymac scrollowanie w 2 sekundy
- Hashtagi aktualne i popularne w PL

Odpowiadasz WYLACZNIE poprawnym JSON bez zadnego tekstu przed ani po. Nie uzywaj markdown.

KRYTYCZNE - cudzyslowy w wartosciach JSON:
- W tekstach postow, hookach, opisach NIGDY nie uzywaj prostych cudzyslowow " w srodku wartosci - to LAMIE JSON.
- Zamiast " uzywaj WYLACZNIE apostrofow ' - prosty single-quote.
- Przyklad ZLE: "text": "Mowilismy "tak" wszystkim"   <- NIEPOPRAWNY JSON
- Przyklad DOBRZE: "text": "Mowilismy 'tak' wszystkim"  <- POPRAWNY JSON
- Nawet w pol jak "rationale", "why", "context", "hook" - tylko apostrofy '.

DRUGIE WAZNE: Trzymaj kazde pole zwiezle:
- "title" max 60 znakow
- "hook" max 100 znakow  
- "why" max 200 znakow
- kazdy "post" w sample posts max 250 znakow
Dluzsze teksty czesto zawieraja apostrofy/cudzyslowy ktore lamia JSON.`

  const prompt = `REAL TIME MARKETING - ${today}

KONTEKST:
- Kraj: ${ctry}
- Marka: ${brand}
- Branza: ${ind}
- USP: ${usp}
- Ton komunikacji: ${tone}
- Persona klienta: ${persona}
- Platformy: ${plt}
${freshNewsContext ? `
═══ AKTUALNE WYDARZENIA Z INTERNETU (świeze dane z dzisiaj) ═══
Wykorzystaj te informacje jako KRYTYCZNE zrodlo aktualnych okazji RTM.
Te dane zawieraja prawdziwe wydarzenia ktorych Ty mogles nie znac.

${freshNewsContext}

═════════════════════════════════════════
` : ''}

ZADANIE:
Na podstawie ${freshNewsContext ? 'powyzszych aktualnych danych ORAZ ' : ''}Twojej wiedzy o wydarzeniach, trendach, swietach i rocznicach w ${ctry} na dzien ${today}, zidentyfikuj 3 najlepsze okazje RTM i wygeneruj gotowe profesjonalne posty dla marki ${brand}.

Kazda okazja musi:
- Naturalnie pasowac do marki i branzy ${ind}
- Miec konkretne uzasadnienie dlaczego pasuje
- Zawierac gotowe posty dla wszystkich platform (${plt}) - pelne teksty, nie szkice

ZWROC JSON:
{
  "date": "${today}",
  "opportunities": [
    {
      "id": "o1",
      "title": "Konkretna nazwa okazji (swieto/wydarzenie/trend)",
      "category": "swieto|kultura|sport|technologia|trend|news|meme|biznes|rocznica",
      "relevance": "wysokie|srednie|niskie",
      "why": "Szczegolowe uzasadnienie dlaczego ta okazja pasuje do marki ${brand} i jej klientow - konkretne powiazanie tematyczne",
      "risk": "Ewentualne ryzyko komunikacyjne lub 'brak'",
      "urgency": "dzisiaj|ten tydzien|ten miesiac",
      "posts": [
        {
          "platform": "facebook",
          "angle": "Kreatywny koncept - jak marka sie podpina, co jest lacznikiem tematycznym",
          "text": "Pelny profesjonalny tekst posta okolo 100-120 slow, w tonie ${tone}. Angażujacy, z CTA, wartosciowy dla odbiorcy. Musi byc gotowy do publikacji.",
          "hook": "Pierwsze 1-2 zdania ktore zatrzymaja scrollowanie",
          "hashtags": ["#RelevantTag1", "#RelevantTag2", "#RelevantTag3", "#RelevantTag4", "#RelevantTag5"],
          "imageIdea": "Szczegolowy opis grafiki lub wideo - co ma byc pokazane, jakie kolory, jaki mood"
        },
        {
          "platform": "instagram",
          "angle": "Koncept dla IG - bardziej wizualny i emocjonalny",
          "text": "Caption dla Instagram z emoji, storytellingiem, do 2200 znakow. Wartosciowy content.",
          "hook": "Pierwsze zdanie + emoji - musi zatrzymac kciuk",
          "hashtags": ["#Tag1", "#Tag2", "#Tag3", "#Tag4", "#Tag5", "#Tag6", "#Tag7"],
          "imageIdea": "Pomysl na reel lub karuzele - szczegolowy opis"
        }
      ]
    }
  ],
  "todayCalendar": [
    {
      "name": "Nazwa swieta/rocznicy/dnia tematycznego",
      "type": "swieto_panstwowe|dzien_tematyczny|rocznica|wydarzenie",
      "potential": "wysoki|sredni|niski",
      "idea": "Konkretny pomysl jak marka ${brand} moze to wykorzystac w komunikacji"
    }
  ],
  "weeklyTrends": [
    {
      "trend": "Nazwa trendu lub hashtagu ktory trenduje",
      "platform": "Platforma gdzie trenduje",
      "relevance": "Jak konkretnie branza ${ind} i marka ${brand} moze sie pod to podpiac"
    }
  ],
  "avoidTopics": [
    "Konkretny temat do unikniecia dzis z krotkim uzasadnieniem dlaczego"
  ],
  "rtmTips": [
    "Konkretna wskazowka RTM na dzis dostosowana do marki ${brand}",
    "wskazowka 2",
    "wskazowka 3"
  ]
}

Wygeneruj DOKLADNIE 3 okazje RTM - wysoka jakosc per okazja, nie ilosc.`

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
          max_tokens: 16000,
          stream: true,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        })

        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullText += event.delta.text
            send({ chunk: event.delta.text })
          }
        }

        console.log('RTM finished, length:', fullText.length)
        const { parsed, strategy } = repairAIJSON(fullText)

        if (parsed) {
          console.log('RTM parsed OK via:', strategy)
          send({ done: true, data: parsed })
          sentDone = true
        } else {
          console.error('RTM parse failed. Raw len:', fullText.length)
          console.error('Last 500 chars:', fullText.slice(-500))
          
          // LAST RESORT: try to extract individual opportunities from broken JSON
          // by matching pattern { "id": "...", "title": "...", ... }
          const partial = extractPartialOpportunities(fullText)
          if (partial.length >= 3) {
            console.log(`RTM: extracted ${partial.length} opportunities from broken JSON`)
            send({
              done: true,
              data: {
                date: new Date().toLocaleDateString('pl-PL'),
                opportunities: partial,
                _partial: true,
                _warning: `AI zwróciło niepoprawny JSON. Udało się odzyskać ${partial.length} okazji RTM.`
              }
            })
            sentDone = true
          } else {
            // Find error position for debugging
            const start = fullText.indexOf('{')
            const end = fullText.lastIndexOf('}')
            const clean = end > start ? fullText.slice(start, end + 1) : fullText.slice(start)
            try {
              JSON.parse(clean)
            } catch (e) {
              const msg = e instanceof Error ? e.message : ''
              const match = msg.match(/position (\d+)/)
              const debugInfo: Record<string, unknown> = { strategy: 'all-failed', len: fullText.length }
              if (match) {
                const pos = parseInt(match[1])
                debugInfo.errorPos = pos
                debugInfo.context = clean.slice(Math.max(0, pos - 100), pos + 100)
                console.error('Error context:', debugInfo.context)
              }
              send({ error: 'Nie mozna sparsowac JSON: ' + msg, debug: debugInfo })
              sentDone = true
            }
          }
        }
      } catch (err) {
        console.error('RTM error:', err)
        send({ error: err instanceof Error ? err.message : 'Blad' })
        sentDone = true
      }

      if (!sentDone) send({ error: 'Stream bez wyniku' })
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

// Last-resort extraction: pull individual opportunity objects from possibly-broken JSON.
// Each opportunity is roughly: { "id": "...", "title": "...", "category": "...", ... }
// Even if the array is unclosed or one object is malformed, we can recover others.
import { jsonrepair } from 'jsonrepair'

function extractPartialOpportunities(text: string): unknown[] {
  const opportunities: unknown[] = []
  
  // Find all { ... } blocks that look like opportunities
  // Walk through tracking brace depth
  let depth = 0
  let inStr = false
  let esc = false
  let blockStart = -1
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    
    if (ch === '{') {
      if (depth === 1) blockStart = i  // depth 1 = we're inside top-level "opportunities" array
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 1 && blockStart >= 0) {
        const block = text.slice(blockStart, i + 1)
        // Quick check: must contain at least "id" or "title"
        if (/"(id|title|category|why)"/.test(block)) {
          try {
            opportunities.push(JSON.parse(block))
          } catch {
            // Try jsonrepair on this single block
            try {
              const repaired = jsonrepair(block)
              opportunities.push(JSON.parse(repaired))
            } catch {
              // Skip this broken object
            }
          }
        }
        blockStart = -1
      }
    }
  }
  
  return opportunities
}
