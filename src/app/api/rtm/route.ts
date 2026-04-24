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
  throw new Error('Blad parsowania')
}

export async function POST(req: NextRequest) {
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.reason, limit_exceeded: true }, { status: 429 })
  }

  try {
    const { dna, industry, platforms, country } = await req.json()
    const today = new Date().toLocaleDateString('pl', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    const brand = (dna?.brandName || 'Marka').replace(/['"\\]/g, '')
    const ind = (industry || dna?.industry || 'ogolna').replace(/['"\\]/g, '')
    const tone = (dna?.tone || 'profesjonalny').replace(/['"\\]/g, '')
    const persona = (dna?.persona || '').replace(/['"\\]/g, '').slice(0, 80)
    const plt = (platforms || ['facebook', 'instagram']).slice(0, 2).join(' i ')

    const prompt = `Jestes ekspertem RTM. Dzis: ${today}. Kraj: ${country || 'Polska'}.
Marka: ${brand} | Branza: ${ind} | Ton: ${tone} | Odbiorcy: ${persona} | Platformy: ${plt}

Znajdz 3 aktualne okazje RTM (swieta, trendy, newsy) i napisz gotowe posty.

JSON (bez markdown):
{"date":"${today}","opportunities":[{"id":"o1","title":"NAZWA","category":"swieto","relevance":"wysokie","why":"DLACZEGO PASUJE DO ${brand}","risk":"brak","urgency":"dzisiaj","posts":[{"platform":"facebook","angle":"KONCEPT","text":"TEKST POSTA DLA ${brand} - min 3 zdania w tonie ${tone}","hook":"PIERWSZE ZDANIE","hashtags":["#tag1","#tag2","#tag3"],"imageIdea":"POMYSL NA GRAFIKE"},{"platform":"instagram","angle":"KONCEPT IG","text":"CAPTION Z EMOJI","hook":"HOOK","hashtags":["#tag1","#tag2","#tag3","#tag4"],"imageIdea":"POMYSL"}]},{"id":"o2","title":"NAZWA2","category":"trend","relevance":"srednie","why":"DLACZEGO","risk":"brak","urgency":"ten tydzien","posts":[{"platform":"facebook","angle":"KONCEPT","text":"TEKST POSTA","hook":"HOOK","hashtags":["#tag"],"imageIdea":"POMYSL"},{"platform":"instagram","angle":"KONCEPT","text":"CAPTION","hook":"HOOK","hashtags":["#tag"],"imageIdea":"POMYSL"}]},{"id":"o3","title":"NAZWA3","category":"kultura","relevance":"srednie","why":"DLACZEGO","risk":"brak","urgency":"ten tydzien","posts":[{"platform":"facebook","angle":"KONCEPT","text":"TEKST","hook":"HOOK","hashtags":["#tag"],"imageIdea":"POMYSL"}]}],"todayCalendar":[{"name":"SWIETO LUB ROCZNICA","type":"swieto","potential":"wysoki","idea":"POMYSL DLA ${brand}"},{"name":"DZIEN TEMATYCZNY","type":"dzien_tematyczny","potential":"sredni","idea":"POMYSL"}],"weeklyTrends":[{"trend":"TREND","platform":"instagram","relevance":"JAK ${brand} MOZE SIE PODPIAC"},{"trend":"TREND2","platform":"tiktok","relevance":"JAK SIE PODPIAC"}],"avoidTopics":["TEMAT DO UNIKNIECIA - DLACZEGO"],"rtmTips":["WSKAZOWKA 1 DLA ${brand}","WSKAZOWKA 2","WSKAZOWKA 3"]}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content.map((b: {type:string;text?:string}) => b.type==='text'?b.text:'').join('')
    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error('RTM error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad RTM' }, { status: 500 })
  }
}
