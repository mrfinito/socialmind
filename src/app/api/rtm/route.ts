import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { dna, industry, platforms, country } = await req.json()
    const today = new Date().toLocaleDateString('pl', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    const brand = (dna?.brandName || 'Marka').replace(/['"]/g, '')
    const ind = (industry || dna?.industry || 'ogolna').replace(/['"]/g, '')
    const tone = (dna?.tone || 'profesjonalny').replace(/['"]/g, '')
    const persona = (dna?.persona || '').replace(/['"]/g, '').slice(0, 100)

    const prompt = `Ekspert RTM. Dzis: ${today}. Marka: ${brand}, branza: ${ind}, ton: ${tone}, persona: ${persona}, kraj: ${country||'Polska'}, platformy: ${(platforms||['facebook','instagram']).join(', ')}.

Znajdz 4 okazje RTM i wygeneruj posty. Tylko czysty JSON:
{"date":"${today}","opportunities":[{"id":"o1","title":"nazwa trendu/swieta/newsa","category":"sport|kultura|technologia|swieto|trend|news|meme","relevance":"wysokie","why":"dlaczego pasuje do ${brand}","risk":"ryzyko lub brak","urgency":"dzisiaj|ten tydzien","posts":[{"platform":"facebook","angle":"koncept podpiecia","text":"pelny tekst posta min 100 slow w tonie ${tone}","hook":"pierwsze zdanie","hashtags":["#tag1","#tag2","#tag3"],"imageIdea":"pomysl na grafike"},{"platform":"instagram","angle":"koncept dla IG","text":"caption z emoji","hook":"hook+emoji","hashtags":["#tag1","#tag2","#tag3","#tag4"],"imageIdea":"pomysl na reel lub grafike"}]},{"id":"o2","title":"nazwa 2","category":"swieto","relevance":"srednie","why":"dlaczego pasuje","risk":"brak","urgency":"dzisiaj","posts":[{"platform":"facebook","angle":"koncept","text":"tekst posta","hook":"hook","hashtags":["#tag"],"imageIdea":"pomysl"},{"platform":"instagram","angle":"koncept","text":"caption","hook":"hook","hashtags":["#tag"],"imageIdea":"pomysl"}]},{"id":"o3","title":"nazwa 3","category":"trend","relevance":"srednie","why":"dlaczego","risk":"brak","urgency":"ten tydzien","posts":[{"platform":"facebook","angle":"koncept","text":"tekst","hook":"hook","hashtags":["#tag"],"imageIdea":"pomysl"},{"platform":"instagram","angle":"koncept","text":"caption","hook":"hook","hashtags":["#tag"],"imageIdea":"pomysl"}]},{"id":"o4","title":"nazwa 4","category":"kultura","relevance":"niskie","why":"dlaczego","risk":"brak","urgency":"ten tydzien","posts":[{"platform":"facebook","angle":"koncept","text":"tekst","hook":"hook","hashtags":["#tag"],"imageIdea":"pomysl"}]}],"todayCalendar":[{"name":"swieto lub rocznica","type":"swieto|rocznica|dzien_tematyczny","potential":"wysoki|sredni","idea":"pomysl dla ${brand}"},{"name":"swieto 2","type":"dzien_tematyczny","potential":"sredni","idea":"pomysl"}],"weeklyTrends":[{"trend":"trend tygodnia","platform":"instagram","relevance":"jak ${brand} moze sie podpiac"},{"trend":"trend 2","platform":"tiktok","relevance":"jak sie podpiac"}],"avoidTopics":["temat do unikniecia z powodem","temat 2"],"rtmTips":["wskazowka RTM dla ${brand} na dzis","wskazowka 2","wskazowka 3"]}`

    const stream = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      stream: true,
      messages: [{ role: 'user', content: prompt }]
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        let fullText = ''
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text
            }
          }
          // Parse and send complete response
          let clean = fullText.replace(/```json\n?|```\n?/g, '').trim()
          const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
          if (s !== -1 && e !== -1) clean = clean.slice(s, e + 1)
          
          try {
            const parsed = JSON.parse(clean)
            controller.enqueue(encoder.encode(JSON.stringify({ ok: true, data: parsed })))
          } catch {
            controller.enqueue(encoder.encode(JSON.stringify({ error: 'Blad parsowania odpowiedzi AI' })))
          }
        } catch(err) {
          controller.enqueue(encoder.encode(JSON.stringify({ error: err instanceof Error ? err.message : 'Blad' })))
        }
        controller.close()
      }
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Blad RTM' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}
