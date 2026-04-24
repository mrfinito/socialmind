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

  try {
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

Znajdz 4 aktualne okazje RTM na dzis i napisz gotowe posty dla marki ${brand}.
Odpowiedz TYLKO czystym JSON bez markdown:
{
  "date": "${today}",
  "opportunities": [
    {
      "id": "o1",
      "title": "nazwa okazji RTM",
      "category": "swieto",
      "relevance": "wysokie",
      "why": "dlaczego pasuje do marki ${brand}",
      "risk": "brak",
      "urgency": "dzisiaj",
      "posts": [
        {"platform": "facebook", "angle": "koncept", "text": "pelny tekst posta min 3 zdania", "hook": "pierwsze zdanie", "hashtags": ["#tag1", "#tag2", "#tag3"], "imageIdea": "pomysl na grafike"},
        {"platform": "instagram", "angle": "koncept IG", "text": "caption z emoji", "hook": "hook z emoji", "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4"], "imageIdea": "pomysl na reel"}
      ]
    },
    {"id": "o2", "title": "nazwa 2", "category": "trend", "relevance": "srednie", "why": "dlaczego", "risk": "brak", "urgency": "ten tydzien", "posts": [{"platform": "facebook", "angle": "koncept", "text": "tekst posta", "hook": "hook", "hashtags": ["#tag1", "#tag2"], "imageIdea": "pomysl"}]},
    {"id": "o3", "title": "nazwa 3", "category": "kultura", "relevance": "srednie", "why": "dlaczego", "risk": "brak", "urgency": "ten tydzien", "posts": [{"platform": "facebook", "angle": "koncept", "text": "tekst", "hook": "hook", "hashtags": ["#tag1"], "imageIdea": "pomysl"}]},
    {"id": "o4", "title": "nazwa 4", "category": "news", "relevance": "niskie", "why": "dlaczego", "risk": "brak", "urgency": "ten tydzien", "posts": [{"platform": "facebook", "angle": "koncept", "text": "tekst", "hook": "hook", "hashtags": ["#tag1"], "imageIdea": "pomysl"}]}
  ],
  "todayCalendar": [
    {"name": "swieto lub rocznica", "type": "swieto", "potential": "wysoki", "idea": "pomysl dla ${brand}"},
    {"name": "dzien tematyczny", "type": "dzien_tematyczny", "potential": "sredni", "idea": "pomysl"}
  ],
  "weeklyTrends": [
    {"trend": "trend tygodnia", "platform": "instagram", "relevance": "jak ${brand} moze sie podpiac"},
    {"trend": "trend 2", "platform": "tiktok", "relevance": "jak sie podpiac"}
  ],
  "avoidTopics": ["temat do unikniecia z powodem"],
  "rtmTips": ["wskazowka 1 dla ${brand}", "wskazowka 2", "wskazowka 3"]
}`

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4000,
            stream: true,
            messages: [{ role: 'user', content: prompt }]
          })

          let fullText = ''

          for await (const event of anthropicStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: event.delta.text })}\n\n`))
            }
          }

          const start = fullText.indexOf('{')
          const end = fullText.lastIndexOf('}')
          let clean = start !== -1 && end !== -1 ? fullText.slice(start, end + 1) : fullText

          try {
            const parsed = JSON.parse(clean)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, data: parsed })}\n\n`))
          } catch {
            clean = clean.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, (m) =>
              m.replace(/\n/g, '\\n').replace(/\r/g, '\\r')
            )
            try {
              const parsed = JSON.parse(clean)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, data: parsed })}\n\n`))
            } catch {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Blad parsowania' })}\n\n`))
            }
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : 'Blad' })}\n\n`))
        }
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Blad RTM' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
