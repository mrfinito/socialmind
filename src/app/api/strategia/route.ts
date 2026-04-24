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
    const { dna, competitors, targetAudience, goals, budget, duration, platforms } = await req.json()
    const brand = (dna?.brandName || 'Marka').replace(/['"\\]/g, '')
    const ind = (dna?.industry || 'ogolna').replace(/['"\\]/g, '')
    const tone = (dna?.tone || 'profesjonalny').replace(/['"\\]/g, '')
    const usp = (dna?.usp || '').replace(/['"\\]/g, '').slice(0, 80)
    const persona = (dna?.persona || '').replace(/['"\\]/g, '').slice(0, 80)
    const plt = (platforms || ['facebook','instagram']).join(', ')
    const dur = duration || '3 miesiace'

    const prompt = `Strateg social media. Stworz strategie dla marki.
Marka: ${brand} | Branza: ${ind} | Ton: ${tone} | USP: ${usp} | Persona: ${persona}
Konkurenci: ${(competitors||'brak').slice(0,60)} | Cele: ${(goals||[]).join(', ')} | Budzet: ${budget||'sredni'} | Horyzont: ${dur} | Platformy: ${plt}

JSON (bez markdown):
{"executiveSummary":"PODSUMOWANIE 2-3 ZDANIA KONKRETNE","brandPosition":{"currentState":"OBECNA POZYCJA","desiredState":"CEL ZA ${dur}","gap":"CO ZROBIC","uniqueVoice":"UNIKALNY GLOS MARKI"},"audienceInsight":{"primarySegment":"OPIS SEGMENTU","painPoints":["BOL 1","BOL 2","BOL 3"],"motivations":["MOTYWACJA 1","MOTYWACJA 2"],"contentConsumption":"KIEDY I JAK KONSUMUJE CONTENT","decisionFactors":["CZYNNIK 1","CZYNNIK 2"]},"competitiveAnalysis":{"marketGaps":["LUKA 1","LUKA 2","LUKA 3"],"differentiators":["WYROZNIK 1","WYROZNIK 2"],"competitorWeaknesses":"CO KONKURENCJA ROBI ZLE"},"contentStrategy":{"pillars":[{"name":"FILAR 1","description":"OPIS CO I DLACZEGO","percentage":30,"examples":["PRZYKLAD POSTA","PRZYKLAD 2"]},{"name":"FILAR 2","description":"OPIS","percentage":25,"examples":["PRZYKLAD"]},{"name":"FILAR 3","description":"OPIS","percentage":25,"examples":["PRZYKLAD"]},{"name":"FILAR 4","description":"OPIS","percentage":20,"examples":["PRZYKLAD"]}],"toneGuidelines":["ZASADA 1","ZASADA 2","ZASADA 3"],"doList":["ROBIC 1","ROBIC 2","ROBIC 3"],"dontList":["NIE ROBIC 1","NIE ROBIC 2"]},"platformStrategy":[{"platform":"${plt.split(',')[0].trim()}","role":"ROLA W STRATEGII","frequency":"X RAZY TYGODNIOWO","bestFormats":["FORMAT 1","FORMAT 2"],"bestTimes":"GODZINY I DNI","kpi":"GLOWNY KPI","contentMix":"PROPORCJE TRESCI"}],"contentCalendar":{"weeklyRhythm":"RYTM TYGODNIOWY SZCZEGOLOWY","monthlyThemes":["TEMAT 1","TEMAT 2","TEMAT 3"],"keyDates":["DATA 1","DATA 2"],"campaignIdeas":[{"name":"KAMPANIA 1","concept":"OPIS KONCEPTU","timing":"KIEDY"},{"name":"KAMPANIA 2","concept":"OPIS","timing":"KIEDY"}]},"kpis":[{"metric":"Zasieg","target":"LICZBA/MIES","timeline":"${dur}","howToMeasure":"NARZEDZIE"},{"metric":"Zaangazowanie","target":"PROCENT","timeline":"${dur}","howToMeasure":"JAK MIERZYC"},{"metric":"Obserwujacy","target":"WZROST/MIES","timeline":"${dur}","howToMeasure":"JAK MIERZYC"}],"actionPlan":[{"week":"Tydzien 1-2","actions":["AKCJA 1","AKCJA 2","AKCJA 3"]},{"week":"Tydzien 3-4","actions":["AKCJA 1","AKCJA 2"]},{"week":"Miesiac 2","actions":["AKCJA 1","AKCJA 2"]},{"week":"Miesiac 3","actions":["AKCJA 1","AKCJA 2"]}],"budget":{"organic":"PLAN ORGANICZNY","paid":"PODZIAL BUDZETU ${budget||'dostepnego'}","tools":["NARZEDZIE 1","NARZEDZIE 2","NARZEDZIE 3"]},"hashtags":{"brand":["#BRAND1","#BRAND2"],"industry":["#BRANZA1","#BRANZA2","#BRANZA3"],"campaign":"#HASHTAG_KAMPANII"}}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content.map((b: {type:string;text?:string}) => b.type==='text'?b.text:'').join('')
    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error('Strategia error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad strategii' }, { status: 500 })
  }
}
