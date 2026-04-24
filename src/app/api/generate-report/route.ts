import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

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
  throw new Error('Nie mozna przetworzyc odpowiedzi AI')
}



export async function POST(req: NextRequest) {

  try {
    const { project, drafts, period } = await req.json()

    const published = drafts.filter((d: {status:string}) => d.status === 'published').length
    const scheduled = drafts.filter((d: {status:string}) => d.status === 'scheduled').length
    const total = drafts.length

    const platformCounts: Record<string,number> = {}
    drafts.forEach((d: {platforms:string[]}) => {
      d.platforms?.forEach((p: string) => { platformCounts[p] = (platformCounts[p]||0)+1 })
    })

    const topPlatform = Object.entries(platformCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'facebook'
    const topics = drafts.map((d: {topic:string}) => d.topic).filter(Boolean).slice(0,10).join(', ')

    const prompt = `Jestes ekspertem od content marketingu. Wygeneruj profesjonalne podsumowanie miesiaca dla klienta.

Dane projektu:
- Nazwa: ${project?.name || 'Projekt'}
- Klient: ${project?.client || 'Klient'}
- Okres: ${period}
- Laczna liczba postow: ${total}
- Opublikowane: ${published}
- Zaplanowane: ${scheduled}
- Najpopularniejsza platforma: ${topPlatform}
- Tematy postow: ${topics || 'brak'}
- Brand DNA nisza: ${project?.dna?.industry || 'brak'}

Odpowiedz TYLKO w JSON (bez markdown):
{
  "executiveSummary": "2-3 zdania profesjonalnego podsumowania dla klienta",
  "highlights": [
    { "metric": "Wygenerowane posty", "value": "${total}", "change": "+X% vs poprzedni miesiac", "positive": true },
    { "metric": "Opublikowane", "value": "${published}", "change": "", "positive": true },
    { "metric": "Zaplanowane", "value": "${scheduled}", "change": "", "positive": true },
    { "metric": "Aktywne platformy", "value": "${Object.keys(platformCounts).length}", "change": "", "positive": true }
  ],
  "platformBreakdown": ${JSON.stringify(Object.entries(platformCounts).map(([p,c])=>({platform:p,count:c,percentage:Math.round(c/Math.max(total,1)*100)})))},
  "topContent": [
    { "topic": "przykladowy temat 1", "platform": "facebook", "insight": "dlaczego to zadziala" },
    { "topic": "przykladowy temat 2", "platform": "instagram", "insight": "dlaczego to zadziala" }
  ],
  "recommendations": [
    "rekomendacja na kolejny miesiac 1",
    "rekomendacja na kolejny miesiac 2",
    "rekomendacja na kolejny miesiac 3"
  ],
  "nextMonthFocus": "co priorytetyzowac w nastepnym miesiacu (2-3 zdania)"
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = response.content.map((b: {type: string; text?: string}) => (b.type === 'text' ? b.text : '')).join('')
    const parsed = robustParse(rawText)

    return NextResponse.json({ ok: true, data: parsed, meta: { total, published, scheduled, period, project: project?.name } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Blad generowania raportu' }, { status: 500 })
  }
}
