import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkAnthropicKey } from '@/lib/aiGuards'
import { checkGenerationLimit } from '@/lib/checkLimits'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 120

interface Slide {
  id: string
  type: string
  title: string
  subtitle?: string
  content?: string[]
  speakerNotes?: string
  imageIdea?: string
  imageUrl?: string
}

export async function POST(req: NextRequest) {
  const _envGuard = checkAnthropicKey()
  if (_envGuard) return _envGuard

  const _limit = await checkGenerationLimit()
  if (!_limit.allowed) return NextResponse.json({ error: _limit.reason }, { status: 429 })

  try {
    const { instruction, action, presentation, slideIndex } = await req.json() as {
      instruction: string
      action: 'add' | 'modify' | 'rewrite-all' | 'modify-slide'
      presentation: { title: string; slides: Slide[] }
      slideIndex?: number
    }

    if (!instruction || !presentation?.slides) {
      return NextResponse.json({ error: 'Brak danych' }, { status: 400 })
    }

    const slidesContext = presentation.slides.map((s, i) =>
      `[Slajd ${i+1}] ${s.type}: ${s.title}${s.content?.length ? ' | ' + s.content.join(' / ').slice(0, 200) : ''}`
    ).join('\n')

    const systemPrompt = `Jestes ekspertem od prezentacji biznesowych. Odpowiadasz WYLACZNIE poprawnym JSON bez markdown.`

    let userPrompt = ''
    
    if (action === 'add') {
      userPrompt = `PREZENTACJA: ${presentation.title}
ISTNIEJACE SLAJDY:
${slidesContext}

INSTRUKCJA UZYTKOWNIKA: "${instruction}"

Stworz NOWY slajd (lub kilka slajdow) na podstawie tej instrukcji. Zwroc JSON:
{
  "slides": [
    {
      "type": "title|section|content|stats|quote|comparison|cta",
      "title": "...",
      "subtitle": "..." (jesli pasuje),
      "content": ["..."] (bullety / dane),
      "speakerNotes": "...",
      "imageIdea": "Detailed image prompt for AI",
      "insertAfterIndex": ${typeof slideIndex === 'number' ? slideIndex : presentation.slides.length - 1}
    }
  ]
}

Mozesz zwrocic 1-3 slajdy. Pasuj styl i ton do reszty prezentacji.`
    } else if (action === 'modify-slide' && typeof slideIndex === 'number') {
      const slide = presentation.slides[slideIndex]
      userPrompt = `KONTEKST PREZENTACJI: ${presentation.title}

OBECNY SLAJD ${slideIndex+1}:
Typ: ${slide.type}
Tytul: ${slide.title}
${slide.subtitle ? `Podtytul: ${slide.subtitle}\n` : ''}${slide.content?.length ? `Tresc:\n- ${slide.content.join('\n- ')}\n` : ''}Speaker notes: ${slide.speakerNotes || 'brak'}

INSTRUKCJA: "${instruction}"

Zwroc poprawiony slajd jako JSON:
{
  "slide": {
    "type": "${slide.type}",
    "title": "...",
    "subtitle": "..." (opcjonalnie),
    "content": ["..."] (jesli ma sens),
    "speakerNotes": "...",
    "imageIdea": "..."
  }
}`
    } else if (action === 'modify') {
      userPrompt = `PREZENTACJA: ${presentation.title}
ISTNIEJACE SLAJDY:
${slidesContext}

INSTRUKCJA: "${instruction}"

Wprowadz zmiany w istniejacych slajdach. Zwroc JSON z TYLKO zmienionymi slajdami:
{
  "modifications": [
    {
      "slideIndex": 0,
      "changes": {
        "title": "...",
        "content": ["..."],
        "speakerNotes": "..."
      }
    }
  ]
}`
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
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
    let parsed = null
    try { parsed = JSON.parse(clean) } catch {}
    if (!parsed) {
      clean = clean.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, m =>
        m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
      )
      try { parsed = JSON.parse(clean) } catch {}
    }
    if (!parsed) {
      clean = clean.replace(/,(\s*[}\]])/g, '$1')
      try { parsed = JSON.parse(clean) } catch {}
    }

    if (!parsed) {
      return NextResponse.json({ error: 'Nie udalo sie sparsowac' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, ...parsed })
  } catch (err) {
    console.error('Edit error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad' }, { status: 500 })
  }
}
