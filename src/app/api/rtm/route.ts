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

Znajdz 3 okazje RTM i napisz posty. Odpowiedz TYLKO JSON bez markdown:
{
  "date": "${today}",
  "opportunities": [
    {"id":"o1","title":"nazwa","category":"swieto","relevance":"wysokie","why":"dlaczego pasuje do ${brand}","risk":"brak","urgency":"dzisiaj","posts":[{"platform":"facebook","angle":"koncept","text":"tekst posta min 3 zdania","hook":"pierwsze zdanie","hashtags":["#tag1","#tag2","#tag3"],"imageIdea":"pomysl na grafike"},{"platform":"instagram","angle":"koncept IG","text":"caption z emoji","hook":"hook z emoji","hashtags":["#tag1","#tag2","#tag3","#tag4"],"imageIdea":"pomysl na reel"}]},
    {"id":"o2","title":"nazwa 2","category":"trend","relevance":"srednie","why":"dlaczego","risk":"brak","urgency":"ten tydzien","posts":[{"platform":"facebook","angle":"koncept","text":"tekst","hook":"hook","hashtags":["#tag1","#tag2"],"imageIdea":"pomysl"}]},
    {"id":"o3","title":"nazwa 3","category":"kultura","relevance":"srednie","why":"dlaczego","risk":"brak","urgency":"ten tydzien","posts":[{"platform":"facebook","angle":"koncept","text":"tekst","hook":"hook","hashtags":["#tag1"],"imageIdea":"pomysl"}]}
  ],
  "todayCalendar":[{"name":"swieto","type":"swieto","potential":"wysoki","idea":"pomysl dla ${brand}"},{"name":"dzien tematyczny","type":"dzien_tematyczny","potential":"sredni","idea":"pomysl"}],
  "weeklyTrends":[{"trend":"trend","platform":"instagram","relevance":"jak sie podpiac"},{"trend":"trend 2","platform":"tiktok","relevance":"jak"}],
  "avoidTopics":["temat do unikniecia"],
  "rtmTips":["wskazowka 1","wskazowka 2","wskazowka 3"]
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

    const parsed = robustParse(fullText)
    return NextResponse.json({ ok: true, data: parsed })

  } catch (err) {
    console.error('RTM error:', err instanceof Error ? err.message : err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad RTM'
    }, { status: 500 })
  }
}
