import { NextRequest, NextResponse } from 'next/server'
import { checkGenerationLimit } from '@/lib/checkLimits'
import Anthropic from '@anthropic-ai/sdk'

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
  throw new Error('Nie mozna przetworzyc odpowiedzi')
}

// Industry benchmarks
const BENCHMARKS: Record<string, number> = {
  'edukacja': 71, 'restauracja': 68, 'moda': 74, 'beauty': 76,
  'technologia': 65, 'finanse': 62, 'zdrowie': 69, 'sport': 72,
  'nieruchomosci': 64, 'ogolna': 67,
}

export async function POST(req: NextRequest) {
  try {
  // Check generation limit
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return NextResponse.json({
      error: limitCheck.reason || 'Przekroczono limit generowania',
      limit_exceeded: true,
      used: limitCheck.used,
      limit: limitCheck.limit,
    }, { status: 429 })
  }

    const { text, platform, dna } = await req.json()
    if (!text?.trim()) throw new Error('Brak tekstu do oceny')

    const industry = dna?.industry?.toLowerCase() || 'ogolna'
    const benchmark = BENCHMARKS[Object.keys(BENCHMARKS).find(k => industry.includes(k)) || 'ogolna'] || 67

    const prompt = `Jestes ekspertem od content marketingu i social media. Oceń ponizszy post.

PLATFORMA: ${platform || 'instagram'}
${dna ? `BRAND DNA: marka ${dna.brandName}, ton: ${dna.tone}, persona: ${dna.persona}` : ''}
BRANZOWY BENCHMARK: ${benchmark}/100

POST DO OCENY:
---
${text}
---

Odpowiedz TYLKO czystym JSON:
{"totalScore":${Math.floor(Math.random()*20+60)},"benchmark":${benchmark},"categories":[{"name":"Hook","score":0,"max":15,"icon":"🎣","feedback":"konkretna uwaga co poprawic lub co dziala"},{"name":"Czytelnosc","score":0,"max":12,"icon":"👁","feedback":"konkretna uwaga"},{"name":"CTA","score":0,"max":12,"icon":"👆","feedback":"konkretna uwaga"},{"name":"Dlugosc","score":0,"max":10,"icon":"📏","feedback":"konkretna uwaga"},{"name":"Hashtagi","score":0,"max":10,"icon":"#️⃣","feedback":"konkretna uwaga"},{"name":"Brand DNA","score":0,"max":15,"icon":"🧬","feedback":"konkretna uwaga"},{"name":"Wiralnosc","score":0,"max":13,"icon":"🔥","feedback":"konkretna uwaga"},{"name":"Emocje","score":0,"max":13,"icon":"❤️","feedback":"konkretna uwaga"}],"topSuggestion":"najwazniejsza jedna zmiana ktora najbardziej podniesie skutecznosc","improvedVersion":"poprawiona wersja posta z zastosowanymi sugestiami","verdict":"swietny|dobry|sredni|slaby"}`

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content.map((b: {type:string;text?:string}) => b.type==='text'?b.text:'').join('')
    const parsed = robustParse(raw) as Record<string, unknown>

    // Recalculate total from categories
    const cats = parsed.categories as {score:number;max:number}[]
    const total = cats?.reduce((sum, c) => sum + (c.score || 0), 0) || parsed.totalScore

    return NextResponse.json({ ok: true, data: { ...parsed, totalScore: total, benchmark } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad oceny' }, { status: 500 })
  }
}
