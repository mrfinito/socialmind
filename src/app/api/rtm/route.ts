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
    clean = clean
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/,(\s*[}\]])/g, '$1')
    try { return JSON.parse(clean) } catch {}
  }
  throw new Error('Blad parsowania odpowiedzi')
}

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
    const plt = Array.isArray(platforms) ? platforms.slice(0, 2).join(' i ') : 'facebook i instagram'

    const systemPrompt = `Jestes ekspertem Real Time Marketingu. Odpowiadasz WYLACZNIE czystym JSON bez zadnego tekstu przed ani po. Nie uzywaj markdown ani backtickow.`

    const userPrompt = `Dzisiaj: ${today}. Kraj: ${country || 'Polska'}.
Marka: ${brand}. Branza: ${ind}. Ton: ${tone}. Odbiorcy: ${persona}. Platformy: ${plt}.

Wygeneruj 3 okazje RTM na dzis. Zwroc TYLKO ten JSON (wypelnij CAPS wartosciami):

{"date":"${today}","opportunities":[{"id":"o1","title":"NAZWA OKAZJI","category":"swieto","relevance":"wysokie","why":"DLACZEGO PASUJE DO MARKI","risk":"brak","urgency":"dzisiaj","posts":[{"platform":"facebook","angle":"KONCEPT PODPIECIA","text":"PELNY TEKST POSTA MIN 3 ZDANIA","hook":"PIERWSZE ZDANIE","hashtags":["#tag1","#tag2","#tag3"],"imageIdea":"POMYSL NA GRAFIKE"},{"platform":"instagram","angle":"KONCEPT IG","text":"CAPTION Z EMOJI","hook":"HOOK Z EMOJI","hashtags":["#tag1","#tag2","#tag3","#tag4"],"imageIdea":"POMYSL NA REEL"}]},{"id":"o2","title":"NAZWA 2","category":"trend","relevance":"srednie","why":"DLACZEGO","risk":"brak","urgency":"ten tydzien","posts":[{"platform":"facebook","angle":"KONCEPT","text":"TEKST POSTA","hook":"HOOK","hashtags":["#tag1","#tag2"],"imageIdea":"POMYSL"},{"platform":"instagram","angle":"KONCEPT","text":"CAPTION","hook":"HOOK","hashtags":["#tag1","#tag2"],"imageIdea":"POMYSL"}]},{"id":"o3","title":"NAZWA 3","category":"kultura","relevance":"srednie","why":"DLACZEGO","risk":"brak","urgency":"ten tydzien","posts":[{"platform":"facebook","angle":"KONCEPT","text":"TEKST","hook":"HOOK","hashtags":["#tag1"],"imageIdea":"POMYSL"}]}],"todayCalendar":[{"name":"SWIETO LUB DZIEN TEMATYCZNY","type":"swieto","potential":"wysoki","idea":"POMYSL DLA MARKI"},{"name":"INNE SWIETO","type":"dzien_tematyczny","potential":"sredni","idea":"POMYSL"}],"weeklyTrends":[{"trend":"TREND TYGODNIA","platform":"instagram","relevance":"JAK MARKA MOZE SIE PODPIAC"},{"trend":"TREND 2","platform":"tiktok","relevance":"JAK SIE PODPIAC"}],"avoidTopics":["TEMAT DO UNIKNIECIA"],"rtmTips":["WSKAZOWKA 1","WSKAZOWKA 2","WSKAZOWKA 3"]}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const raw = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error('RTM error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad RTM'
    }, { status: 500 })
  }
}
