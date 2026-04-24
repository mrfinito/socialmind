import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { dna, competitors, targetAudience, goals, budget, duration, platforms } = await req.json()
    const brand = (dna?.brandName || 'Marka').replace(/['"]/g, '')
    const ind = (dna?.industry || 'ogolna').replace(/['"]/g, '')
    const tone = (dna?.tone || 'profesjonalny').replace(/['"]/g, '')

    const prompt = `Strateg social media. Stworz strategie komunikacji.
Marka: ${brand}, branza: ${ind}, ton: ${tone}
USP: ${(dna?.usp||'').slice(0,80)}, persona: ${(dna?.persona||'').slice(0,80)}
Konkurenci: ${(competitors||'').slice(0,80)}, cele: ${(goals||[]).join(', ')}
Budzet: ${budget||'sredni'}, horyzont: ${duration||'3 miesiace'}
Platformy: ${(platforms||['facebook','instagram']).join(', ')}

Odpowiedz TYLKO JSON:
{"executiveSummary":"podsumowanie strategii 3 zdania konkretne","brandPosition":{"currentState":"obecna pozycja na rynku","desiredState":"cel za ${duration||'3 miesiace'} konkretny mierzalny","gap":"co trzeba zrobic","uniqueVoice":"jak marka powinna brzmiec co ja wyróznia"},"audienceInsight":{"primarySegment":"opis segmentu demografia psychografia","painPoints":["konkretny bol 1","bol 2","bol 3"],"motivations":["motywacja 1","motywacja 2"],"contentConsumption":"kiedy i jak konsumuje content","decisionFactors":["czynnik 1","czynnik 2"]},"competitiveAnalysis":{"marketGaps":["luka rynkowa 1","luka 2","luka 3"],"differentiators":["wyroznik 1","wyroznik 2"],"competitorWeaknesses":"co konkurencja robi zle"},"contentStrategy":{"pillars":[{"name":"Filar 1 nazwa","description":"opis co i dlaczego","percentage":30,"examples":["przyklad posta","przyklad 2"]},{"name":"Filar 2","description":"opis","percentage":25,"examples":["przyklad"]},{"name":"Filar 3","description":"opis","percentage":25,"examples":["przyklad"]},{"name":"Filar 4","description":"opis","percentage":20,"examples":["przyklad"]}],"toneGuidelines":["zasada 1","zasada 2","zasada 3"],"doList":["robic 1","robic 2","robic 3"],"dontList":["nie robic 1","nie robic 2"]},"platformStrategy":[{"platform":"${(platforms||['facebook'])[0]}","role":"rola w strategii","frequency":"X razy tygodniowo","bestFormats":["format 1","format 2"],"bestTimes":"godziny i dni","kpi":"glowny KPI","contentMix":"proporcje tresci"}],"contentCalendar":{"weeklyRhythm":"szczegolowy rytm tygodniowy","monthlyThemes":["temat 1","temat 2","temat 3"],"keyDates":["data 1","data 2"],"campaignIdeas":[{"name":"Kampania 1","concept":"opis konceptu","timing":"kiedy"},{"name":"Kampania 2","concept":"opis","timing":"kiedy"}]},"kpis":[{"metric":"Zasieg","target":"liczba/mies","timeline":"${duration||'3 miesiace'}","howToMeasure":"narzedzie"},{"metric":"Zaangazowanie","target":"procent","timeline":"${duration||'3 miesiace'}","howToMeasure":"jak mierzyc"},{"metric":"Obserwujacy","target":"wzrost/mies","timeline":"${duration||'3 miesiace'}","howToMeasure":"jak mierzyc"}],"actionPlan":[{"week":"Tydzien 1-2","actions":["akcja 1","akcja 2","akcja 3"]},{"week":"Tydzien 3-4","actions":["akcja 1","akcja 2"]},{"week":"Miesiac 2","actions":["akcja 1","akcja 2"]},{"week":"Miesiac 3","actions":["akcja 1","akcja 2"]}],"budget":{"organic":"plan organiczny co robic","paid":"jak rozdzielic budzet ${budget||'dostepny'}","tools":["narzedzie 1","narzedzie 2","narzedzie 3"]},"hashtags":{"brand":["#brand1","#brand2"],"industry":["#branża1","#branża2","#branża3"],"campaign":"#hashtagKampanii"}}`

    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3500,
      stream: true,
      messages: [{ role: 'user', content: prompt }]
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        let fullText = ''
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text
            }
          }
          let clean = fullText.replace(/```json\n?|```\n?/g, '').trim()
          const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
          if (s !== -1 && e !== -1) clean = clean.slice(s, e + 1)
          try {
            const parsed = JSON.parse(clean)
            controller.enqueue(encoder.encode(JSON.stringify({ ok: true, data: parsed })))
          } catch {
            controller.enqueue(encoder.encode(JSON.stringify({ error: 'Blad parsowania' })))
          }
        } catch(err) {
          controller.enqueue(encoder.encode(JSON.stringify({ error: err instanceof Error ? err.message : 'Blad' })))
        }
        controller.close()
      }
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Blad strategii' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}
