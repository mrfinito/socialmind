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
    clean = clean.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/,(\s*[}\]])/g, '$1')
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

    const { content, contentType, platforms, dna, voiceSamples } = await req.json()
    if (!content?.trim()) throw new Error('Brak treści do przerobienia')

    // Voice analysis from history samples
    const voiceContext = voiceSamples?.length
      ? `ANALIZA GŁOSU MARKI (na podstawie poprzednich postów):
${voiceSamples.slice(0,3).map((s: string, i: number) => `Przykład ${i+1}: "${s.slice(0,200)}"`).join('\n')}
Zachowaj ten unikalny styl, charakterystyczne frazy i ton.`
      : ''

    const prompt = `Jestes ekspertem od content repurposingu. Przepisz ponizszy content na posty social media ZACHOWUJAC glos i styl marki.

${dna ? `BRAND DNA:
Marka: ${dna.brandName}, Branza: ${dna.industry}
Ton: ${dna.tone}, Persona: ${dna.persona}
USP: ${dna.usp}, Slowa kluczowe: ${dna.keywords}
Master prompt: ${dna.masterPrompt}` : ''}

${voiceContext}

TYP ZRODLA: ${contentType || 'artykul'}
PLATFORMY DO ADAPTACJI: ${(platforms || ['facebook','instagram','linkedin']).join(', ')}

TRESC DO PRZEPISANIA:
---
${content.slice(0, 3000)}
---

Odpowiedz TYLKO czystym JSON:
{
  "keyInsights": ["insight 1 wyciagniety z tresci", "insight 2", "insight 3"],
  "posts": {
    "facebook": {
      "text": "post dla FB (300-500 znakow, storytelling)",
      "hook": "pierwsze zdanie ktore zatrzymuje",
      "hashtags": ["#tag1", "#tag2"],
      "format": "post|karuzela|reel",
      "tip": "wskazowka publikacji"
    },
    "instagram": {
      "text": "post dla IG (caption, emoji, do 2200 znakow)",
      "hook": "pierwsze zdanie",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
      "format": "post|karuzela|reel",
      "tip": "wskazowka publikacji"
    },
    "linkedin": {
      "text": "post dla LinkedIn (profesjonalny, merytoryczny, 600-1200 znakow)",
      "hook": "pierwsze zdanie",
      "hashtags": ["#tag1", "#tag2"],
      "format": "post|artykul",
      "tip": "wskazowka publikacji"
    },
    "x": {
      "text": "tweet (max 280 znakow)",
      "hook": "pierwsze zdanie",
      "hashtags": ["#tag1"],
      "format": "tweet|thread",
      "tip": "wskazowka publikacji"
    },
    "tiktok": {
      "text": "caption TikTok + opis wideo",
      "hook": "hook na pierwsze 3 sekundy wideo",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "format": "wideo",
      "tip": "wskazowka nagrania"
    }
  },
  "voiceNotes": "krotka analiza jak zachowano glos marki w adaptacjach"
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content.map((b: {type:string;text?:string}) => b.type==='text'?b.text:'').join('')
    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad repurposingu' }, { status: 500 })
  }
}
