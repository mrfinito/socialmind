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
    const { dna, competitors, targetAudience, goals, budget, duration, platforms } = await req.json()
    const brand = String(dna?.brandName || 'Marka').slice(0, 50)
    const ind = String(dna?.industry || 'ogolna').slice(0, 50)
    const tone = String(dna?.tone || 'profesjonalny').slice(0, 80)
    const persona = String(dna?.persona || targetAudience || '').slice(0, 80)
    const plt = Array.isArray(platforms) ? platforms.slice(0, 2).join(', ') : 'facebook'
    const dur = String(duration || '3 miesiace')
    const goalsStr = Array.isArray(goals) ? goals.slice(0, 3).join(', ') : 'swiadomosc marki'

    const prompt = `Strateg social media. JSON strategia dla: ${brand}, ${ind}, ton: ${tone}, persona: ${persona}, konkurenci: ${String(competitors||'brak').slice(0,60)}, cele: ${goalsStr}, budzet: ${String(budget||'sredni')}, ${dur}, platformy: ${plt}.

Odpowiedz TYLKO JSON:
{"executiveSummary":"...","brandPosition":{"currentState":"...","desiredState":"...","gap":"...","uniqueVoice":"..."},"audienceInsight":{"primarySegment":"...","painPoints":["...","...","..."],"motivations":["...","..."],"contentConsumption":"...","decisionFactors":["...","..."]},"competitiveAnalysis":{"marketGaps":["...","...","..."],"differentiators":["...","..."],"competitorWeaknesses":"..."},"contentStrategy":{"pillars":[{"name":"...","description":"...","percentage":30,"examples":["...","..."]},{"name":"...","description":"...","percentage":25,"examples":["..."]},{"name":"...","description":"...","percentage":25,"examples":["..."]},{"name":"...","description":"...","percentage":20,"examples":["..."]}],"toneGuidelines":["...","...","..."],"doList":["...","...","..."],"dontList":["...","..."]},"platformStrategy":[{"platform":"${plt.split(',')[0].trim()}","role":"...","frequency":"...","bestFormats":["...","..."],"bestTimes":"...","kpi":"...","contentMix":"..."}],"contentCalendar":{"weeklyRhythm":"...","monthlyThemes":["...","...","..."],"keyDates":["...","..."],"campaignIdeas":[{"name":"...","concept":"...","timing":"..."},{"name":"...","concept":"...","timing":"..."}]},"kpis":[{"metric":"Zasieg","target":"...","timeline":"${dur}","howToMeasure":"..."},{"metric":"Zaangazowanie","target":"...","timeline":"${dur}","howToMeasure":"..."},{"metric":"Obserwujacy","target":"...","timeline":"${dur}","howToMeasure":"..."}],"actionPlan":[{"week":"Tydzien 1-2","actions":["...","...","..."]},{"week":"Tydzien 3-4","actions":["...","..."]},{"week":"Miesiac 2","actions":["...","..."]},{"week":"Miesiac 3","actions":["...","..."]}],"budget":{"organic":"...","paid":"...","tools":["...","...","..."]},"hashtags":{"brand":["#...","#..."],"industry":["#...","#...","#..."],"campaign":"#..."}}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    console.log('Strategia len:', raw.length, 'start:', raw.slice(0, 40), 'end:', raw.slice(-40))

    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })

  } catch (err) {
    console.error('Strategia error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad strategii'
    }, { status: 500 })
  }
}
