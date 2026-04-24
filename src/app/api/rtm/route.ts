import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { robustParse } from '@/lib/parseJSON'
import { checkGenerationLimit } from '@/lib/checkLimits'

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
    const brand = String(dna?.brandName || 'Marka').slice(0, 50)
    const ind = String(industry || dna?.industry || 'ogolna').slice(0, 50)
    const tone = String(dna?.tone || 'profesjonalny').slice(0, 80)
    const persona = String(dna?.persona || '').slice(0, 80)
    const plt = Array.isArray(platforms) ? platforms.slice(0, 2) : ['facebook', 'instagram']

    const prompt = `Jestes ekspertem RTM (Real Time Marketing). 
Dzisiaj: ${today}. Kraj: ${country || 'Polska'}.
Marka: ${brand}. Branza: ${ind}. Ton: ${tone}. Odbiorcy: ${persona}.
Platformy: ${plt.join(', ')}.

Zadanie: Znajdz 3 aktualne okazje RTM i wygeneruj posty dla marki ${brand}.

Odpowiedz TYLKO jako JSON. Struktura:
{
  "date": "data dzisiaj",
  "opportunities": [
    {
      "id": "o1",
      "title": "nazwa okazji",
      "category": "swieto lub trend lub news lub kultura",
      "relevance": "wysokie",
      "why": "dlaczego pasuje do tej marki",
      "risk": "ryzyko komunikacyjne lub brak",
      "urgency": "dzisiaj",
      "posts": [
        {
          "platform": "facebook",
          "angle": "koncept podpiecia",
          "text": "pelny tekst posta min 3 zdania",
          "hook": "pierwsze zdanie",
          "hashtags": ["#tag1", "#tag2", "#tag3"],
          "imageIdea": "opis grafiki"
        },
        {
          "platform": "instagram",
          "angle": "koncept dla IG",
          "text": "caption z emoji",
          "hook": "hook z emoji",
          "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4"],
          "imageIdea": "opis reela lub grafiki"
        }
      ]
    },
    { drugi obiekt okazji },
    { trzeci obiekt okazji }
  ],
  "todayCalendar": [
    {"name": "nazwa swieta", "type": "swieto", "potential": "wysoki", "idea": "pomysl dla marki"},
    {"name": "inne swieto", "type": "dzien_tematyczny", "potential": "sredni", "idea": "pomysl"}
  ],
  "weeklyTrends": [
    {"trend": "trend tygodnia", "platform": "instagram", "relevance": "jak sie podpiac"},
    {"trend": "trend 2", "platform": "tiktok", "relevance": "jak sie podpiac"}
  ],
  "avoidTopics": ["temat do unikniecia"],
  "rtmTips": ["wskazowka 1", "wskazowka 2", "wskazowka 3"]
}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: '{' }
      ]
    })

    const rawContent = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')
    const raw = '{' + rawContent

    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error('RTM error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad RTM'
    }, { status: 500 })
  }
}
