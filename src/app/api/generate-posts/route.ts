import { NextRequest, NextResponse } from 'next/server'
import { checkGenerationLimit } from '@/lib/checkLimits'
import Anthropic from '@anthropic-ai/sdk'
import type { Platform } from '@/lib/types'

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



const PLATFORM_SPECS: Record<Platform, { chars: number; format: string; dims: string }> = {
  facebook:  { chars: 400,  format: 'post na Facebook z emoji i CTA',                              dims: '1200x630' },
  instagram: { chars: 300,  format: 'post Instagram + 12 hashtagów (oddzielone od tekstu \n\n)',   dims: '1080x1080' },
  linkedin:  { chars: 700,  format: 'post LinkedIn — profesjonalny, z akapitami i CTA',            dims: '1200x627' },
  x:         { chars: 270,  format: 'tweet — zwięzły, angażujący, opcjonalnie wątek (1/n)',        dims: '1600x900' },
  pinterest: { chars: 450,  format: 'opis Pina — inspirujący, słowa kluczowe SEO',                 dims: '1000x1500' },
  tiktok:    { chars: 2000, format: 'skrypt wideo TikTok (hook 3s + treść + CTA + hashtagi)',      dims: '1080x1920' },
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

    const { masterPrompt, platforms, topic, goals, tones } = await req.json() as {
      masterPrompt: string
      platforms: Platform[]
      topic: string
      goals: string[]
      tones: string[]
    }

    const platformInstructions = platforms.map(p => {
      const s = PLATFORM_SPECS[p]
      return `"${p}": { "text": "${s.format}, max ${s.chars} znaków", "imagePrompt": "prompt do grafiki ${s.dims}px dla Midjourney/DALL-E po angielsku — opisz styl, nastrój, kompozycję, kolory" }`
    }).join(',\n')

    const prompt = `${masterPrompt}

Stwórz posty social media dla platform: ${platforms.join(', ')}.
Temat/kampania: ${topic || 'ogólna promocja marki'}
Cele: ${goals.join(', ') || 'świadomość marki'}
Ton: ${tones.join(', ') || 'profesjonalny'}

WAŻNE dla image promptów:
- Pisz po angielsku
- Podaj styl fotograficzny lub ilustracyjny
- Opisz kompozycję, oświetlenie, kolory zgodne z marką
- Dodaj format: "aspect ratio X:Y, commercial photography / illustration style"
- Unikaj tekstu na grafikach

Odpowiedz TYLKO w formacie JSON (bez markdown):
{
  "brandName": "nazwa marki z master promptu",
  "brandShort": "2-3 litery",
  ${platformInstructions}
}`

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.map(b => (b.type === 'text' ? b.text : '')).join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({ ok: true, content: parsed })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Błąd generowania postów' }, { status: 500 })
  }
}
