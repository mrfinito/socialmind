import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return new Response(JSON.stringify({ error: limitCheck.reason }), {
      status: 429, headers: { 'Content-Type': 'application/json' }
    })
  }

  const { dna, industry, platforms, country } = await req.json()
  const today = new Date().toLocaleDateString('pl', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  const brand = String(dna?.brandName || 'Marka')
  const ind = String(industry || dna?.industry || 'ogolna')
  const tone = String(dna?.tone || 'profesjonalny')
  const persona = String(dna?.persona || 'brak')
  const usp = String(dna?.usp || 'brak')
  const plt = Array.isArray(platforms) ? platforms.join(', ') : 'facebook, instagram'

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

Odpowiadasz WYLACZNIE poprawnym JSON bez zadnego tekstu przed ani po. Nie uzywaj markdown.`

  const prompt = `REAL TIME MARKETING - ${today}

KONTEKST:
- Kraj: ${country || 'Polska'}
- Marka: ${brand}
- Branza: ${ind}
- USP: ${usp}
- Ton komunikacji: ${tone}
- Persona klienta: ${persona}
- Platformy: ${plt}

ZADANIE:
Na podstawie Twojej wiedzy o aktualnych wydarzeniach, trendach, swietach i rocznicach w Polsce na dzien ${today}, zidentyfikuj 3 najlepsze okazje RTM i wygeneruj gotowe profesjonalne posty dla marki ${brand}.

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
        const start = fullText.indexOf('{')
        const end = fullText.lastIndexOf('}')

        if (start === -1 || end === -1) {
          send({ error: 'Brak JSON w odpowiedzi AI' })
          sentDone = true
        } else {
          let clean = fullText.slice(start, end + 1)
          let parsed = null

          try { parsed = JSON.parse(clean) } catch {}
          if (!parsed) {
            // Fix newlines in strings
            const fixed = clean.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, (m) =>
              m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
            )
            try { parsed = JSON.parse(fixed) } catch {}
            if (!parsed) {
              // Remove trailing commas
              const noCommas = fixed.replace(/,(\s*[}\]])/g, '$1')
              try { parsed = JSON.parse(noCommas) } catch {}
            }
          }
          
          // If still not parsed, try to repair truncated JSON
          if (!parsed) {
            try {
              // Try to find last complete structure and close remaining braces
              let repaired = fullText.slice(start)
              // Remove trailing incomplete content after last } or ]
              const lastValidEnd = Math.max(
                repaired.lastIndexOf('}'),
                repaired.lastIndexOf(']')
              )
              if (lastValidEnd > 0) {
                repaired = repaired.slice(0, lastValidEnd + 1)
              }
              // Count unclosed braces and brackets
              let openBraces = 0, openBrackets = 0, inString = false, escape = false
              for (let i = 0; i < repaired.length; i++) {
                const ch = repaired[i]
                if (escape) { escape = false; continue }
                if (ch === '\\') { escape = true; continue }
                if (ch === '"') { inString = !inString; continue }
                if (inString) continue
                if (ch === '{') openBraces++
                if (ch === '}') openBraces--
                if (ch === '[') openBrackets++
                if (ch === ']') openBrackets--
              }
              // Close unclosed structures
              while (openBrackets > 0) { repaired += ']'; openBrackets-- }
              while (openBraces > 0) { repaired += '}'; openBraces-- }
              // Also fix newlines
              repaired = repaired.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, (m) =>
                m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
              )
              repaired = repaired.replace(/,(\s*[}\]])/g, '$1')
              parsed = JSON.parse(repaired)
              console.log('Parsed truncated JSON via repair')
            } catch {}
          }

          if (parsed) {
            console.log('RTM parsed OK')
            send({ done: true, data: parsed })
          } else {
            console.error('RTM parse failed. Raw len:', fullText.length)
            console.error('First 500:', fullText.slice(0, 500))
            console.error('Last 500:', fullText.slice(-500))
            send({ error: 'Nie mozna przetworzyc JSON', debug: { len: fullText.length, first: fullText.slice(0, 200), last: fullText.slice(-200) } })
          }
          sentDone = true
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
