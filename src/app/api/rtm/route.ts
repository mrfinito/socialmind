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
    const { dna, industry, platforms, country } = await req.json()
    const today = new Date().toLocaleDateString('pl', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    const brand = String(dna?.brandName || 'Marka').slice(0, 40)
    const ind = String(industry || dna?.industry || 'ogolna').slice(0, 40)
    const tone = String(dna?.tone || 'profesjonalny').slice(0, 60)
    const plt = Array.isArray(platforms) ? platforms.slice(0, 2).join(' i ') : 'facebook'

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1800,
      system: 'Jestes ekspertem RTM. Odpowiadasz TYLKO czystym JSON bez markdown.',
      messages: [{
        role: 'user',
        content: `Dzis: ${today}. Kraj: ${country || 'Polska'}.
Marka: ${brand}. Branza: ${ind}. Ton: ${tone}. Platformy: ${plt}.

Wygeneruj JSON z 3 okazjami RTM:
{
  "date": "${today}",
  "opportunities": [
    {
      "id": "o1",
      "title": "nazwa okazji RTM",
      "category": "swieto",
      "relevance": "wysokie",
      "why": "dlaczego pasuje do marki ${brand}",
      "risk": "brak",
      "urgency": "dzisiaj",
      "posts": [
        {
          "platform": "facebook",
          "angle": "koncept podpiecia",
          "text": "gotowy tekst posta dla marki ${brand}",
          "hook": "pierwsze zdanie",
          "hashtags": ["#tag1", "#tag2"],
          "imageIdea": "pomysl na grafike"
        }
      ]
    },
    {
      "id": "o2",
      "title": "nazwa 2",
      "category": "trend",
      "relevance": "srednie",
      "why": "dlaczego pasuje",
      "risk": "brak",
      "urgency": "ten tydzien",
      "posts": [{"platform": "facebook", "angle": "koncept", "text": "tekst", "hook": "hook", "hashtags": ["#tag"], "imageIdea": "pomysl"}]
    },
    {
      "id": "o3",
      "title": "nazwa 3",
      "category": "kultura",
      "relevance": "srednie",
      "why": "dlaczego pasuje",
      "risk": "brak",
      "urgency": "ten tydzien",
      "posts": [{"platform": "facebook", "angle": "koncept", "text": "tekst", "hook": "hook", "hashtags": ["#tag"], "imageIdea": "pomysl"}]
    }
  ],
  "todayCalendar": [
    {"name": "swieto dzisiaj", "type": "swieto", "potential": "wysoki", "idea": "pomysl"},
    {"name": "inne swieto", "type": "dzien_tematyczny", "potential": "sredni", "idea": "pomysl"}
  ],
  "weeklyTrends": [
    {"trend": "trend tygodnia", "platform": "instagram", "relevance": "jak sie podpiac"},
    {"trend": "trend 2", "platform": "tiktok", "relevance": "jak sie podpiac"}
  ],
  "avoidTopics": ["temat do unikniecia"],
  "rtmTips": ["wskazowka 1", "wskazowka 2", "wskazowka 3"]
}`
      }]
    })

    const raw = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    console.log('RTM raw first 80:', raw.slice(0, 80))

    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })

  } catch (err) {
    console.error('RTM error:', err instanceof Error ? err.message : err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad RTM'
    }, { status: 500 })
  }
}
