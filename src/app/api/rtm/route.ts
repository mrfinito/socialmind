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

  const { dna, industry, platforms, country } = await req.json()
  const today = new Date().toLocaleDateString('pl', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  const brand = String(dna?.brandName || 'Marka').slice(0, 50)
  const ind = String(industry || dna?.industry || 'ogolna').slice(0, 50)
  const tone = String(dna?.tone || 'profesjonalny').slice(0, 80)
  const persona = String(dna?.persona || '').slice(0, 80)
  const plt = Array.isArray(platforms) ? platforms.slice(0, 2).join(', ') : 'facebook, instagram'

  const prompt = `Ekspert RTM. Dzis: ${today}. Kraj: ${country || 'Polska'}.
Marka: ${brand}. Branza: ${ind}. Ton: ${tone}. Odbiorcy: ${persona}. Platformy: ${plt}.

Znajdz 4 aktualne okazje RTM na dzis i napisz gotowe posty.
Odpowiedz TYLKO czystym JSON bez markdown:
{
  "date": "${today}",
  "opportunities": [
    {"id":"o1","title":"nazwa","category":"swieto","relevance":"wysokie","why":"dlaczego pasuje do ${brand}","risk":"brak","urgency":"dzisiaj","posts":[
      {"platform":"facebook","angle":"koncept","text":"pelny tekst posta min 3 zdania","hook":"pierwsze zdanie","hashtags":["#tag1","#tag2","#tag3"],"imageIdea":"pomysl na grafike"},
      {"platform":"instagram","angle":"koncept IG","text":"caption z emoji","hook":"hook z emoji","hashtags":["#tag1","#tag2","#tag3","#tag4"],"imageIdea":"pomysl na reel"}
    ]},
    {"id":"o2","title":"nazwa 2","category":"trend","relevance":"srednie","why":"dlaczego","risk":"brak","urgency":"ten tydzien","posts":[{"platform":"facebook","angle":"koncept","text":"tekst","hook":"hook","hashtags":["#tag"],"imageIdea":"pomysl"}]},
    {"id":"o3","title":"nazwa 3","category":"kultura","relevance":"srednie","why":"dlaczego","risk":"brak","urgency":"ten tydzien","posts":[{"platform":"facebook","angle":"koncept","text":"tekst","hook":"hook","hashtags":["#tag"],"imageIdea":"pomysl"}]},
    {"id":"o4","title":"nazwa 4","category":"news","relevance":"niskie","why":"dlaczego","risk":"brak","urgency":"ten tydzien","posts":[{"platform":"facebook","angle":"koncept","text":"tekst","hook":"hook","hashtags":["#tag"],"imageIdea":"pomysl"}]}
  ],
  "todayCalendar":[{"name":"swieto","type":"swieto","potential":"wysoki","idea":"pomysl dla ${brand}"},{"name":"dzien tematyczny","type":"dzien_tematyczny","potential":"sredni","idea":"pomysl"}],
  "weeklyTrends":[{"trend":"trend tygodnia","platform":"instagram","relevance":"jak ${brand} moze sie podpiac"},{"trend":"trend 2","platform":"tiktok","relevance":"jak sie podpiac"}],
  "avoidTopics":["temat do unikniecia"],
  "rtmTips":["wskazowka 1","wskazowka 2","wskazowka 3"]
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
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 3000,
          stream: true,
          messages: [{ role: 'user', content: prompt }]
        })

        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullText += event.delta.text
            send({ chunk: event.delta.text })
          }
        }

        console.log('RTM stream finished, length:', fullText.length)
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
            console.log('RTM parsed OK')
            send({ done: true, data: parsed })
          } else {
            console.error('RTM parse failed')
            send({ error: 'Nie mozna przetworzyc JSON' })
          }
          sentDone = true
        }
      } catch (err) {
        console.error('RTM stream error:', err)
        send({ error: err instanceof Error ? err.message : 'Blad strumienia' })
        sentDone = true
      }
      
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
