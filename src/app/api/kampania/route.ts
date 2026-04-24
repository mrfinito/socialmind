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
  throw new Error('Nie mozna przetworzyc odpowiedzi AI')
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

    const { brief, platforms, duration, goals, masterPrompt, brandName, industry, tone } = await req.json()

    const postCount = duration === '2weeks' ? 10 : duration === 'month' ? 20 : 30
    const platformList = (platforms || ['facebook','instagram']).join(', ')

    const prompt = `${masterPrompt || 'Jesteś ekspertem od content marketingu i strategii social media.'}

Stwórz kompletny plan kampanii social media na ${duration === '2weeks' ? '2 tygodnie' : duration === 'month' ? 'miesiąc' : '2 miesiące'}.

Marka: ${brandName || 'Marka'}
Branża: ${industry || 'ogólna'}
Brief kampanii: ${brief}
Platformy: ${platformList}
Cele: ${(goals || ['świadomość marki']).join(', ')}
Ton: ${tone || 'profesjonalny'}

Stwórz ${postCount} postów rozłożonych równomiernie. Zadbaj o mix: 40% edukacja, 30% zaangażowanie, 20% sprzedaż, 10% behind-the-scenes.

Odpowiedz TYLKO w JSON (bez markdown):
{
  "campaignName": "nazwa kampanii",
  "campaignTagline": "hasło przewodnie (1 zdanie)",
  "strategy": "opis strategii kampanii (3-4 zdania)",
  "keyMessage": "główny przekaz kampanii",
  "contentPillars": [
    { "name": "nazwa filara", "description": "opis", "percentage": 40 }
  ],
  "posts": [
    {
      "day": 1,
      "week": 1,
      "platform": "facebook",
      "type": "edukacja|zaangażowanie|sprzedaż|behind-the-scenes",
      "topic": "temat posta",
      "hook": "pierwsze zdanie/hook",
      "text": "pełny tekst posta (dostosowany do platformy)",
      "imagePrompt": "prompt graficzny po angielsku dla Midjourney/DALL-E",
      "bestTime": "HH:MM",
      "goal": "cel tego konkretnego posta"
    }
  ],
  "videoScripts": [
    {
      "week": 1,
      "platform": "tiktok",
      "topic": "temat wideo",
      "hook": "hook (pierwsze 3 sekundy)",
      "outline": ["scena 1", "scena 2", "scena 3", "CTA"],
      "duration": "60s",
      "music": "sugestia muzyki"
    }
  ],
  "schedule": {
    "postsPerWeek": 5,
    "bestDays": ["wtorek", "czwartek", "sobota"],
    "bestTimes": { "facebook": "13:00", "instagram": "18:00", "linkedin": "09:00" }
  },
  "hashtags": {
    "primary": ["#hashtag1", "#hashtag2"],
    "secondary": ["#hashtag3", "#hashtag4", "#hashtag5"],
    "campaign": "#unikalnyHashtagKampanii"
  },
  "kpis": [
    { "metric": "Zasięg organiczny", "target": "X osób", "howToMeasure": "opis" }
  ],
  "budget": {
    "organic": "opis działań organicznych",
    "paid": "sugestia budżetu reklamowego",
    "breakdown": "podział budżetu"
  }
}`

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = response.content.map((b: {type: string; text?: string}) => (b.type === 'text' ? b.text : '')).join('')
    const parsed = robustParse(rawText)

    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Błąd generowania kampanii' }, { status: 500 })
  }
}
