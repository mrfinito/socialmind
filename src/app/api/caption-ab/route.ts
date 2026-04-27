import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { robustParse } from '@/lib/parseJSON'
import { checkAnthropicKey, errorResponse, safeJsonBody } from '@/lib/aiGuards'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const keyGuard = checkAnthropicKey()
    if (keyGuard) return keyGuard

    const limit = await checkGenerationLimit()
    if (!limit.allowed) return NextResponse.json({ error: limit.reason }, { status: 429 })

    const parsed = await safeJsonBody<{
      idea: string
      platform: string
      goal: string
      dna?: { brandName?: string; tone?: string; voice?: string; audience?: string }
      pastPosts?: Array<{ caption: string; metrics?: { likes?: number; comments?: number; shares?: number; reach?: number } }>
    }>(req)
    if (parsed.response) return parsed.response
    const { idea, platform, goal, dna, pastPosts } = parsed.body

  if (!idea || idea.trim().length < 10) {
    return NextResponse.json({ error: 'Opisz pomysl na post (min 10 znakow)' }, { status: 400 })
  }

  const tone = dna?.tone || 'profesjonalny'
  const audience = dna?.audience || 'ogólna'

  // Analyze past posts if provided
  let pastInsights = ''
  if (pastPosts && pastPosts.length > 0) {
    const top = [...pastPosts]
      .filter(p => p.metrics)
      .sort((a, b) => {
        const aScore = (a.metrics?.likes || 0) + (a.metrics?.comments || 0) * 5 + (a.metrics?.shares || 0) * 10
        const bScore = (b.metrics?.likes || 0) + (b.metrics?.comments || 0) * 5 + (b.metrics?.shares || 0) * 10
        return bScore - aScore
      })
      .slice(0, 5)
    
    if (top.length > 0) {
      pastInsights = `\n\nNAJLEPSZE POSTY Z PRZESZLOSCI (analiza co dzialalo):
${top.map((p, i) => `${i+1}. "${p.caption.slice(0, 150)}..." - ${p.metrics?.likes || 0} polub.`).join('\n')}`
    }
  }

  const system = `Jestes senior copywriterem social media z 15+ letnim doswiadczeniem. Specjalizujesz sie w:
- A/B testowaniu captions
- Hookach ktore zatrzymuja scroll
- Pattern interrupt
- Storytelling
- Conversion copy

Tworzysz 5 RADYKALNIE roznych wariantow tego samego pomyslu zeby A/B test dal jasne wyniki.

Odpowiadasz WYLACZNIE poprawnym JSON.`

  const prompt = `POMYSL NA POST:
"${idea}"

PLATFORMA: ${platform}
CEL: ${goal}
TON MARKI: ${tone}
GRUPA DOCELOWA: ${audience}
${dna?.brandName ? `MARKA: ${dna.brandName}` : ''}${pastInsights}

Wygeneruj 5 ROZNYCH wariantow captions do A/B testu. Kazdy wariant uzywa innej STRATEGII:

JSON:
{
  "variants": [
    {
      "id": "v1",
      "strategy": "Pytanie - hook ktory pyta odbiorcy",
      "hook": "Pierwsze 1-2 zdania",
      "fullCaption": "Pelen tekst posta",
      "characters": 245,
      "tactics": ["question hook", "social proof", "curiosity gap"],
      "hashtags": ["#tag1", "#tag2"],
      "predictedPerformance": {
        "ctr": "high|medium|low",
        "engagement": "high|medium|low",
        "saves": "high|medium|low",
        "rationale": "Dlaczego ten wariant moze zadzialac"
      },
      "bestFor": "Kiedy ten wariant uzyc"
    },
    {
      "id": "v2",
      "strategy": "Storytelling - osobista historia",
      ...
    },
    {
      "id": "v3",
      "strategy": "Pattern interrupt - shocking statement",
      ...
    },
    {
      "id": "v4",
      "strategy": "Educational - data/insight",
      ...
    },
    {
      "id": "v5",
      "strategy": "Lista / how-to - bardzo skanowalne",
      ...
    }
  ],
  "testingPlan": {
    "duration": "Ile dni testowac",
    "metrics": ["Co mierzymy (CTR, saves, comments...)"],
    "splitMethod": "Jak rozlozyc audience",
    "winnerCriteria": "Kiedy ogloscic zwyciezce"
  },
  "winner": {
    "predictedVariant": "v3",
    "confidence": "medium|high",
    "rationale": "Dlaczego ten wariant ma najwieksza szanse"
  },
  "tips": [
    "Tip 1 dla tego konkretnego pomyslu",
    "Tip 2 platform-specific",
    "Tip 3 tajming"
  ]
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system,
    messages: [{ role: 'user', content: prompt }]
  })

  const raw = response.content
    .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '').join('')

  const parsedResult = robustParse(raw)
  if (!parsedResult) return NextResponse.json({ error: 'Blad parsowania' }, { status: 500 })
  return NextResponse.json({ ok: true, data: parsedResult })
  } catch (err) {
    return errorResponse(err, 'Caption A/B error')
  }
}
