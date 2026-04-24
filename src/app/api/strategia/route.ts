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
  throw new Error('Blad parsowania')
}

export async function POST(req: NextRequest) {
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.reason, limit_exceeded: true }, { status: 429 })
  }

  try {
    const { dna, competitors, targetAudience, goals, budget, duration, platforms } = await req.json()
    const brand = String(dna?.brandName || 'Marka').slice(0, 50)
    const ind = String(dna?.industry || 'ogolna').slice(0, 50)
    const tone = String(dna?.tone || 'profesjonalny').slice(0, 80)
    const usp = String(dna?.usp || '').slice(0, 80)
    const persona = String(dna?.persona || targetAudience || '').slice(0, 80)
    const plt = Array.isArray(platforms) ? platforms[0] : 'facebook'
    const dur = String(duration || '3 miesiace')
    const goalsStr = Array.isArray(goals) ? goals.join(', ') : String(goals || 'swiadomosc marki')

    const systemPrompt = `Jestes strategiem social media. Odpowiadasz WYLACZNIE czystym JSON bez zadnego tekstu przed ani po. Nie uzywaj markdown.`

    const userPrompt = `Stworz strategie komunikacji.
Marka: ${brand} | Branza: ${ind} | Ton: ${tone} | USP: ${usp} | Persona: ${persona}
Konkurenci: ${String(competitors || 'brak').slice(0, 60)} | Cele: ${goalsStr} | Budzet: ${String(budget || 'sredni')} | Horyzont: ${dur} | Platformy: ${String(Array.isArray(platforms) ? platforms.join(', ') : platforms || 'facebook, instagram')}

Zwroc TYLKO ten JSON (wypelnij CAPS wartosciami):

{"executiveSummary":"PODSUMOWANIE 2-3 ZDANIA","brandPosition":{"currentState":"OBECNA POZYCJA","desiredState":"CEL ZA ${dur}","gap":"CO ZROBIC","uniqueVoice":"UNIKALNY GLOS"},"audienceInsight":{"primarySegment":"OPIS SEGMENTU","painPoints":["BOL 1","BOL 2","BOL 3"],"motivations":["MOTYWACJA 1","MOTYWACJA 2"],"contentConsumption":"KIEDY I JAK KONSUMUJE","decisionFactors":["CZYNNIK 1","CZYNNIK 2"]},"competitiveAnalysis":{"marketGaps":["LUKA 1","LUKA 2","LUKA 3"],"differentiators":["WYROZNIK 1","WYROZNIK 2"],"competitorWeaknesses":"CO ROBI ZLE"},"contentStrategy":{"pillars":[{"name":"FILAR 1","description":"OPIS","percentage":30,"examples":["PRZYKLAD 1","PRZYKLAD 2"]},{"name":"FILAR 2","description":"OPIS","percentage":25,"examples":["PRZYKLAD"]},{"name":"FILAR 3","description":"OPIS","percentage":25,"examples":["PRZYKLAD"]},{"name":"FILAR 4","description":"OPIS","percentage":20,"examples":["PRZYKLAD"]}],"toneGuidelines":["ZASADA 1","ZASADA 2","ZASADA 3"],"doList":["ROBIC 1","ROBIC 2","ROBIC 3"],"dontList":["NIE ROBIC 1","NIE ROBIC 2"]},"platformStrategy":[{"platform":"${plt}","role":"ROLA","frequency":"X RAZY TYGODNIOWO","bestFormats":["FORMAT 1","FORMAT 2"],"bestTimes":"GODZINY","kpi":"KPI","contentMix":"PROPORCJE"}],"contentCalendar":{"weeklyRhythm":"RYTM TYGODNIOWY","monthlyThemes":["TEMAT 1","TEMAT 2","TEMAT 3"],"keyDates":["DATA 1","DATA 2"],"campaignIdeas":[{"name":"KAMPANIA 1","concept":"OPIS","timing":"KIEDY"},{"name":"KAMPANIA 2","concept":"OPIS","timing":"KIEDY"}]},"kpis":[{"metric":"Zasieg","target":"LICZBA/MIES","timeline":"${dur}","howToMeasure":"NARZEDZIE"},{"metric":"Zaangazowanie","target":"PROCENT","timeline":"${dur}","howToMeasure":"JAK"},{"metric":"Obserwujacy","target":"WZROST/MIES","timeline":"${dur}","howToMeasure":"JAK"}],"actionPlan":[{"week":"Tydzien 1-2","actions":["AKCJA 1","AKCJA 2","AKCJA 3"]},{"week":"Tydzien 3-4","actions":["AKCJA 1","AKCJA 2"]},{"week":"Miesiac 2","actions":["AKCJA 1","AKCJA 2"]},{"week":"Miesiac 3","actions":["AKCJA 1","AKCJA 2"]}],"budget":{"organic":"PLAN ORGANICZNY","paid":"PODZIAL BUDZETU","tools":["NARZEDZIE 1","NARZEDZIE 2","NARZEDZIE 3"]},"hashtags":{"brand":["#brand1","#brand2"],"industry":["#branza1","#branza2","#branza3"],"campaign":"#hashtagKampanii"}}`

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
    console.error('Strategia error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad strategii'
    }, { status: 500 })
  }
}
