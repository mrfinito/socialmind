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
    const { dna, industry, platforms, country } = await req.json()
    const today = new Date().toLocaleDateString('pl', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    const brand = String(dna?.brandName || 'Marka').slice(0, 60)
    const ind = String(industry || dna?.industry || 'ogolna').slice(0, 60)
    const tone = String(dna?.tone || 'profesjonalny').slice(0, 100)
    const persona = String(dna?.persona || '').slice(0, 100)
    const usp = String(dna?.usp || '').slice(0, 100)
    const plt = Array.isArray(platforms) ? platforms.slice(0, 3).join(', ') : 'facebook, instagram'

    const prompt = `Jestes ekspertem od Real Time Marketingu z doswiadczeniem w polskim rynku.

Dzisiaj jest: ${today}
Kraj: ${country || 'Polska'}
Marka: ${brand}
Branza: ${ind}
Ton komunikacji: ${tone}
Persona klienta: ${persona}
USP: ${usp}
Platformy: ${plt}

Zidentyfikuj 4 aktualne okazje RTM na dzis (swieta, trendy, newsy, rocznice) i wygeneruj gotowe posty dla marki ${brand}.

Odpowiedz TYLKO czystym JSON:
{
  "date": "${today}",
  "opportunities": [
    {
      "id": "o1",
      "title": "konkretna nazwa okazji",
      "category": "swieto",
      "relevance": "wysokie",
      "why": "dlaczego pasuje do marki ${brand} i jej klientow",
      "risk": "ewentualne ryzyko lub brak",
      "urgency": "dzisiaj",
      "posts": [
        {
          "platform": "facebook",
          "angle": "kreatywny koncept podpiecia marki pod temat",
          "text": "pelny profesjonalny tekst posta min 3 zdania w tonie: ${tone}",
          "hook": "pierwsze zdanie zatrzymujace uwage",
          "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4"],
          "imageIdea": "szczegolowy opis grafiki lub wideo"
        },
        {
          "platform": "instagram",
          "angle": "koncept dla Instagram",
          "text": "caption z emoji dla Instagram",
          "hook": "hook z emoji",
          "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
          "imageIdea": "pomysl na reel lub karuzele"
        }
      ]
    },
    {
      "id": "o2",
      "title": "nazwa drugiej okazji",
      "category": "trend",
      "relevance": "srednie",
      "why": "dlaczego pasuje",
      "risk": "brak",
      "urgency": "ten tydzien",
      "posts": [
        {"platform": "facebook", "angle": "koncept", "text": "tekst posta", "hook": "hook", "hashtags": ["#tag1", "#tag2"], "imageIdea": "pomysl"},
        {"platform": "instagram", "angle": "koncept", "text": "caption", "hook": "hook", "hashtags": ["#tag1", "#tag2", "#tag3"], "imageIdea": "pomysl"}
      ]
    },
    {
      "id": "o3",
      "title": "nazwa trzeciej okazji",
      "category": "kultura",
      "relevance": "srednie",
      "why": "dlaczego pasuje",
      "risk": "brak",
      "urgency": "ten tydzien",
      "posts": [
        {"platform": "facebook", "angle": "koncept", "text": "tekst posta", "hook": "hook", "hashtags": ["#tag1", "#tag2"], "imageIdea": "pomysl"}
      ]
    },
    {
      "id": "o4",
      "title": "nazwa czwartej okazji",
      "category": "news",
      "relevance": "niskie",
      "why": "dlaczego pasuje",
      "risk": "brak",
      "urgency": "ten tydzien",
      "posts": [
        {"platform": "facebook", "angle": "koncept", "text": "tekst posta", "hook": "hook", "hashtags": ["#tag1"], "imageIdea": "pomysl"}
      ]
    }
  ],
  "todayCalendar": [
    {"name": "nazwa swieta lub dnia tematycznego", "type": "swieto", "potential": "wysoki", "idea": "konkretny pomysl jak marka ${brand} moze to wykorzystac"},
    {"name": "inna data", "type": "dzien_tematyczny", "potential": "sredni", "idea": "pomysl"}
  ],
  "weeklyTrends": [
    {"trend": "nazwa trendu tygodnia", "platform": "instagram", "relevance": "jak marka ${brand} moze sie podpiac"},
    {"trend": "drugi trend", "platform": "tiktok", "relevance": "jak sie podpiac"}
  ],
  "avoidTopics": ["temat do unikniecia z powodem"],
  "rtmTips": ["konkretna wskazowka RTM dla ${brand} na dzis", "wskazowka 2", "wskazowka 3"]
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })

  } catch (err) {
    console.error('RTM error:', err instanceof Error ? err.message : err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad RTM'
    }, { status: 500 })
  }
}
