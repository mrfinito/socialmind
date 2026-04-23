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
    clean = clean
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/,(\s*[}\]])/g, '$1')
    try { return JSON.parse(clean) } catch {}
  }
  throw new Error('Nie mozna przetworzyc odpowiedzi AI - sprobuj ponownie')
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

    const { competitorUrl, competitorName, ourDNA, platforms } = await req.json()

    const name = (competitorName || competitorUrl || 'konkurent').replace(/['"]/g, '')
    const ourBrand = ourDNA?.brandName || 'nasza marka'
    const ourIndustry = ourDNA?.industry || 'ogolna'
    const slug = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')

    const prompt = `Jestes ekspertem od analizy konkurencji i strategii social media.

Przeanalizuj konkurenta dla marki ${ourBrand} (branza: ${ourIndustry}).
Konkurent: ${name}
URL strony: ${competitorUrl || 'brak'}
Platformy do analizy: ${(platforms || []).join(', ') || 'facebook, instagram, linkedin'}

Na podstawie nazwy i URL wygeneruj realistyczna analize. Zgadnij profile social media na podstawie nazwy firmy.

Odpowiedz TYLKO czystym JSON:

{"socialProfiles":[{"platform":"facebook","estimatedUrl":"https://facebook.com/${slug}","followers":"szacowana liczba np. 2400","postsPerWeek":3,"avgEngagement":"2.1%","contentFocus":"opis glownego contentu","lastActive":"aktywny","strength":"co robi dobrze","weakness":"co robi slabo"},{"platform":"instagram","estimatedUrl":"https://instagram.com/${slug}","followers":"szacowana liczba np. 1800","postsPerWeek":4,"avgEngagement":"3.2%","contentFocus":"opis glownego contentu","lastActive":"aktywny","strength":"co robi dobrze","weakness":"co robi slabo"},{"platform":"linkedin","estimatedUrl":"https://linkedin.com/company/${slug}","followers":"szacowana liczba np. 450","postsPerWeek":1,"avgEngagement":"1.5%","contentFocus":"opis glownego contentu","lastActive":"sporadyczny","strength":"co robi dobrze","weakness":"co robi slabo"}],"competitorProfile":{"estimatedNiche":"nisza i pozycjonowanie konkurenta w brancy ${ourIndustry}","estimatedTone":"ton komunikacji","estimatedStrengths":["sila 1","sila 2","sila 3"],"estimatedWeaknesses":["slabos 1","slabos 2"],"contentMix":{"educational":30,"promotional":40,"entertainment":20,"ugc":10},"overallSocialScore":62},"gaps":[{"gap":"Luka 1","description":"opis luki w strategii konkurenta","opportunity":"jak ${ourBrand} moze to wykorzystac"},{"gap":"Luka 2","description":"opis luki","opportunity":"jak wykorzystac"},{"gap":"Luka 3","description":"opis luki","opportunity":"jak wykorzystac"},{"gap":"Luka 4","description":"opis luki","opportunity":"jak wykorzystac"}],"differentiators":[{"area":"Obszar 1","theyDo":"co robi konkurent","weShouldDo":"co ${ourBrand} powinno robic inaczej"},{"area":"Obszar 2","theyDo":"co robi","weShouldDo":"co robic"},{"area":"Obszar 3","theyDo":"co robi","weShouldDo":"co robic"},{"area":"Obszar 4","theyDo":"co robi","weShouldDo":"co robic"}],"contentInsights":[{"insight":"Wniosek 1","action":"konkretna akcja"},{"insight":"Wniosek 2","action":"konkretna akcja"},{"insight":"Wniosek 3","action":"konkretna akcja"},{"insight":"Wniosek 4","action":"konkretna akcja"}],"recommendations":[{"priority":"wysoki","title":"Rekomendacja 1","description":"szczegoly","timeframe":"natychmiast"},{"priority":"sredni","title":"Rekomendacja 2","description":"szczegoly","timeframe":"1-2 tygodnie"},{"priority":"sredni","title":"Rekomendacja 3","description":"szczegoly","timeframe":"1-2 tygodnie"},{"priority":"niski","title":"Rekomendacja 4","description":"szczegoly","timeframe":"miesiac+"}],"swot":{"strengths":["nasza sila 1","nasza sila 2","nasza sila 3"],"weaknesses":["nasza slabos 1","nasza slabos 2"],"opportunities":["szansa 1","szansa 2"],"threats":["zagrozenie 1","zagrozenie 2"]},"summary":"Strategiczne podsumowanie analizy w 3-4 zdaniach konkretnie opisujace pozycje konkurenta i rekomendacje dla ${ourBrand}."}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    const parsed = robustParse(rawText)
    return NextResponse.json({ ok: true, data: parsed })

  } catch (err) {
    console.error('Competitor error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad analizy konkurenta'
    }, { status: 500 })
  }
}
