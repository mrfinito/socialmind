import { NextRequest, NextResponse } from 'next/server'
import { checkGenerationLimit } from '@/lib/checkLimits'
import Anthropic from '@anthropic-ai/sdk'
import { robustParse } from '@/lib/parseJSON'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })




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

    const { niche, platforms } = await req.json()

    const prompt = `Jestes ekspertem od social media i content marketingu w 2026 roku.
Przeanalizuj nissze: "${niche}" i platformy: ${platforms.join(', ')}.

Na podstawie swojej wiedzy o aktualnych trendach w mediach spolecznosciowych, odpowiedz TYLKO w formacie JSON (bez markdown):
{
  "trends": [
    {
      "topic": "nazwa trendu",
      "description": "krotki opis (1 zdanie)",
      "momentum": "rosnacy|stabilny|opadajacy",
      "platforms": ["facebook","instagram"],
      "postIdea": "konkretny pomysl na post wykorzystujacy ten trend"
    }
  ],
  "hashtags": [
    {
      "tag": "#hashtag",
      "volume": "wysoki|sredni|niski",
      "competition": "wysoka|srednia|niska",
      "recommendation": "polecany|neutralny|unikaj"
    }
  ],
  "contentIdeas": [
    {
      "title": "tytul pomyslu",
      "format": "karuzela|reel|post|stories",
      "hook": "pierwsze zdanie hook",
      "why": "dlaczego teraz zadzialа"
    }
  ],
  "bestTimes": {
    "facebook": "np. wtorek-czwartek 13-16",
    "instagram": "np. poniedzialek sroda piatek 11-13",
    "linkedin": "np. wtorek-czwartek 8-10",
    "x": "np. codziennie 9-10 i 17-18",
    "tiktok": "np. wtorek czwartek 19-21",
    "pinterest": "np. sobota niedziela 20-23"
  },
  "summary": "2-3 zdania podsumowania strategii contentowej dla tej niszy teraz"
}

Generuj 5 trendow, 10 hashtagow, 4 pomysly na content. Odpowiedz realistycznie dla polskiego rynku w 2026.`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = response.content.map((b: {type: string; text?: string}) => (b.type === 'text' ? b.text : '')).join('')
    const parsed = robustParse(rawText)

    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Blad researchu trendow' }, { status: 500 })
  }
}
