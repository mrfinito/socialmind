import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { dna, opportunity, platforms } = await req.json() as {
      dna: { brandName?: string; industry?: string; tone?: string; persona?: string }
      opportunity: { title: string; why?: string; category?: string }
      platforms: string[]
    }

    if (!opportunity?.title) {
      return NextResponse.json({ error: 'Brak okazji' }, { status: 400 })
    }

    const brand = String(dna?.brandName || 'Marka')
    const ind = String(dna?.industry || 'ogolna')
    const tone = String(dna?.tone || 'profesjonalny')
    const persona = String(dna?.persona || 'klienci marki')
    const plt = platforms.slice(0, 4).join(', ')

    const today = new Date().toLocaleDateString('pl', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    const systemPrompt = `Jestes ekspertem Real Time Marketingu z 10-letnim doswiadczeniem na polskim rynku. Tworzysz autentyczne, profesjonalne posty social media wokol konkretnych okazji.

ZASADY:
- Hook musi zatrzymac scrollowanie w 2 sekundy
- Posty min. 100 slow, naturalna polszczyzna
- CTA wartosciowe dla odbiorcy
- Hashtagi popularne i relevantne na polskim rynku

Odpowiadasz WYLACZNIE poprawnym JSON bez markdown.`

    const prompt = `OKAZJA RTM: ${opportunity.title}
${opportunity.why ? `KONTEKST: ${opportunity.why}` : ''}
${opportunity.category ? `KATEGORIA: ${opportunity.category}` : ''}

DANE MARKI:
- Marka: ${brand}
- Branza: ${ind}
- Ton: ${tone}
- Persona: ${persona}
- Platformy: ${plt}

Data: ${today}

Wygeneruj profesjonalne posty social media dla tej okazji RTM. Po jednym poscie na kazda platforme.

ZWROC TYLKO JSON:
{
  "posts": [
    {
      "platform": "facebook",
      "angle": "Kreatywny koncept - jak marka sie podpina, co jest lacznikiem tematycznym",
      "text": "Pelny profesjonalny tekst posta minimum 120 slow, w tonie ${tone}. Angażujacy, z CTA, wartosciowy. Gotowy do publikacji.",
      "hook": "Pierwsze 1-2 zdania ktore zatrzymaja scrollowanie",
      "hashtags": ["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5"],
      "imageIdea": "Szczegolowy opis grafiki - co pokazac, kolory, mood"
    }
  ]
}

Wygeneruj posty dla platform: ${plt}.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return NextResponse.json({ error: 'Brak JSON w odpowiedzi' }, { status: 500 })
    }

    let clean = raw.slice(start, end + 1)
    let parsed: { posts?: unknown[] } | null = null
    try { parsed = JSON.parse(clean) } catch {}
    if (!parsed) {
      clean = clean.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, (m) =>
        m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
      )
      try { parsed = JSON.parse(clean) } catch {}
    }
    if (!parsed) {
      clean = clean.replace(/,(\s*[}\]])/g, '$1')
      try { parsed = JSON.parse(clean) } catch {}
    }

    if (!parsed?.posts) {
      return NextResponse.json({ error: 'Nie udalo sie sparsowac postow' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, posts: parsed.posts })
  } catch (err) {
    console.error('RTM single error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad' }, { status: 500 })
  }
}
