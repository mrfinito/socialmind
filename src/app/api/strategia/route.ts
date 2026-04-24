import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { robustParse } from '@/lib/parseJSON'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
    const pltsStr = Array.isArray(platforms) ? platforms.join(', ') : String(platforms || 'facebook, instagram')

    const prompt = `Jestes strategiem social media. Stworz strategie komunikacji dla marki.

Marka: ${brand}
Branza: ${ind}
Ton: ${tone}
USP: ${usp}
Persona: ${persona}
Konkurenci: ${String(competitors || 'brak').slice(0, 80)}
Cele: ${goalsStr}
Budzet: ${String(budget || 'sredni')}
Horyzont: ${dur}
Platformy: ${pltsStr}

Wygeneruj strategie jako JSON. Zacznij od { i skoncz na }. Nie dodawaj zadnego tekstu poza JSON.

Wymagane pola:
executiveSummary (string),
brandPosition (obiekt z: currentState, desiredState, gap, uniqueVoice),
audienceInsight (obiekt z: primarySegment, painPoints array, motivations array, contentConsumption, decisionFactors array),
competitiveAnalysis (obiekt z: marketGaps array, differentiators array, competitorWeaknesses),
contentStrategy (obiekt z: pillars array, toneGuidelines array, doList array, dontList array),
platformStrategy (array obiektow z: platform, role, frequency, bestFormats array, bestTimes, kpi, contentMix),
contentCalendar (obiekt z: weeklyRhythm, monthlyThemes array, keyDates array, campaignIdeas array),
kpis (array obiektow z: metric, target, timeline, howToMeasure),
actionPlan (array obiektow z: week, actions array),
budget (obiekt z: organic, paid, tools array),
hashtags (obiekt z: brand array, industry array, campaign)`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: '{' }
      ]
    })

    const rawContent = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')
    
    // Prepend the { we used as prefill
    const raw = '{' + rawContent

    console.log('Strategia raw length:', raw.length, 'last50:', raw.slice(-50))

    try {
      const parsed = robustParse(raw)
      return NextResponse.json({ ok: true, data: parsed })
    } catch {
      // Return raw for debugging
      console.error('Parse failed length:', raw.length, 'Last100:', raw.slice(-100))
      return NextResponse.json({
        error: 'Blad parsowania',
        debug: raw.slice(0, 300)
      }, { status: 500 })
    }
  } catch (err) {
    console.error('Strategia error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad strategii'
    }, { status: 500 })
  }
}
