import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { robustParse } from '@/lib/parseJSON'
import { checkAnthropicKey } from '@/lib/aiGuards'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const _envGuard = checkAnthropicKey()
  if (_envGuard) return _envGuard

  const limit = await checkGenerationLimit()
  if (!limit.allowed) return NextResponse.json({ error: limit.reason }, { status: 429 })

  const { product, goal, offer, usp, dna } = await req.json() as {
    product: string
    goal: string
    offer: string
    usp?: string
    dna?: { brandName?: string; industry?: string; tone?: string; audience?: string }
  }

  if (!product || product.trim().length < 5) {
    return NextResponse.json({ error: 'Opisz produkt/usługę (min 5 znaków)' }, { status: 400 })
  }

  const brand = dna?.brandName || 'marka'
  const industry = dna?.industry || ''
  const tone = dna?.tone || 'profesjonalny'
  const audience = dna?.audience || ''

  const system = `Jestes ekspertem od reklam Meta Ads (Facebook/Instagram) z 10+ letnim doswiadczeniem. Tworzysz reklamy ktore:
- Maja silny hook w pierwszych 3 slowach
- Sa zgodne z polityka Meta (bez przesady, bez "you" w atrybutach)
- Maja jasny CTA
- Sa optymalne pod konkretne cele (conversions/traffic/awareness)

LIMITY META:
- Headline: max 27 znakow
- Primary text: 90-125 slow optymalne (max 3000)
- Description: max 27 znakow
- CTA: musi byc z listy Meta

Odpowiadasz WYLACZNIE poprawnym JSON.`

  const userPrompt = `KONTEKST:
Marka: ${brand}${industry ? ` (branża: ${industry})` : ''}
Ton: ${tone}
${audience ? `Grupa docelowa marki: ${audience}` : ''}

PRODUKT/USŁUGA: ${product}
CEL KAMPANII: ${goal}
OFERTA: ${offer}
${usp ? `USP / wyróżniki: ${usp}` : ''}

Wygeneruj 5 zróżnicowanych wariantów reklamy Meta Ads + sugestie audience.

JSON:
{
  "variants": [
    {
      "id": "v1",
      "angle": "krótki opis kąta np. Pain point / Social proof / FOMO / Curiosity / Authority",
      "headline": "Max 27 znakow",
      "primaryText": "Glowny tekst reklamy 90-125 slow",
      "description": "Max 27 znakow",
      "cta": "SHOP_NOW",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "imageIdea": "Detailed prompt for image/creative"
    }
    // ... 5 variants
  ],
  "audiences": [
    {
      "name": "nazwa audience",
      "type": "core|lookalike|retargeting",
      "demographics": {
        "ageMin": 25,
        "ageMax": 45,
        "gender": "all|men|women",
        "locations": ["Polska", "Warszawa"]
      },
      "interests": ["Cooking", "Italian cuisine"],
      "behaviors": ["Frequent online shoppers"],
      "rationale": "Dlaczego ta grupa"
    }
    // ... 3 audiences
  ],
  "tips": [
    "Tip 1 jak zwiekszyc CTR",
    "Tip 2 budget allocation",
    "Tip 3 testowanie"
  ],
  "estimatedBudget": {
    "daily": "50-150 PLN",
    "test": "min 7 dni przy 50 PLN/dzien zeby zebrac dane",
    "rationale": "Dlaczego taki budzet"
  }
}

CTA musi być z whitelisty: SHOP_NOW, LEARN_MORE, SIGN_UP, BOOK_TRAVEL, DOWNLOAD, GET_QUOTE, CONTACT_US, APPLY_NOW, GET_OFFER, SUBSCRIBE.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system,
    messages: [{ role: 'user', content: userPrompt }]
  })

  const raw = response.content
    .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '').join('')

  const parsed = robustParse(raw)
  if (!parsed) {
    return NextResponse.json({ error: 'Blad parsowania' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data: parsed })
}
