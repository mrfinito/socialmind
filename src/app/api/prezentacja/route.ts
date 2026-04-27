import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { checkAnthropicKey } from '@/lib/aiGuards'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const _envGuard = checkAnthropicKey()
  if (_envGuard) return _envGuard

  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return new Response(JSON.stringify({ error: limitCheck.reason }), {
      status: 429, headers: { 'Content-Type': 'application/json' }
    })
  }

  const { topic, audience, slidesCount, style, additionalContext, sourceText, dna } = await req.json() as {
    topic: string
    audience?: string
    slidesCount: number
    style: string
    additionalContext?: string
    sourceText?: string
    dna?: { brandName?: string; industry?: string; tone?: string }
  }

  const brand = String(dna?.brandName || '')
  const industry = String(dna?.industry || '')
  const tone = String(dna?.tone || 'profesjonalny')
  const targetSlides = Math.min(Math.max(slidesCount || 10, 3), 30)

  const systemPrompt = `Jestes senior creative directorem i ekspertem od prezentacji biznesowych z 15-letnim doswiadczeniem. Tworzysz prezentacje:
- Klarowne i konkretne (jeden komunikat per slajd)
- Z dobrym storytellingiem (narracja prowadzi przez deck)
- Wizualnie inspirujace (kazdy slajd ma image idea)
- Profesjonalnie napisane (krotkie hook'i, wartosciowy content)

ZASADY:
- Tytuly slajdow chwytliwe, max 8 slow
- Bullety krotkie (5-12 slow)
- Speaker notes konkretne (2-4 zdania ktore prelegent powie)
- Image ideas SZCZEGOLOWE - mozna potem wygenerowac z AI

Odpowiadasz WYLACZNIE poprawnym JSON bez markdown.`

  const prompt = `STWORZ PREZENTACJE BIZNESOWA

TEMAT: ${topic}
${audience ? `GRUPA DOCELOWA: ${audience}` : ''}
STYL: ${style}
LICZBA SLAJDOW: ${targetSlides}
${brand ? `MARKA: ${brand} (branza: ${industry}, ton: ${tone})` : ''}
${additionalContext ? `\nDODATKOWY KONTEKST:\n${additionalContext.slice(0, 1000)}` : ''}
${sourceText ? `\nMATERIAL ZRODLOWY (uzywaj do tresci):\n${sourceText.slice(0, 5000)}` : ''}

Zwroc JSON z DOKLADNIE ${targetSlides} slajdami:
{
  "title": "Tytul prezentacji",
  "subtitle": "Podtytul / opening line",
  "totalSlides": ${targetSlides},
  "slides": [
    {
      "id": "slide-1",
      "type": "title",
      "title": "Glowny tytul slajdu",
      "subtitle": "Podtytul (opcjonalnie)",
      "content": [],
      "speakerNotes": "Co prelegent ma powiedziec - 2-4 zdania",
      "imageIdea": "Detailed image prompt for AI generation"
    },
    {
      "id": "slide-2",
      "type": "content",
      "title": "Tytul slajdu",
      "content": [
        "Bullet 1 - krotki, konkretny",
        "Bullet 2",
        "Bullet 3"
      ],
      "speakerNotes": "Tekst prelegenta",
      "imageIdea": "Detailed image description"
    },
    {
      "id": "slide-N",
      "type": "section|content|stats|quote|comparison|cta",
      "title": "...",
      "content": ["..."],
      "speakerNotes": "...",
      "imageIdea": "..."
    }
  ]
}

TYPY SLAJDOW:
- "title" - slajd otwierajacy (tytul + podtytul)
- "section" - przejscie miedzy sekcjami (duzy tytul)
- "content" - klasyczny slajd z bulletami
- "stats" - dane liczbowe (uzyj contentu z liczbami w formacie ["35%: opis", "1000+: opis"])
- "quote" - cytat (content[0] = cytat, content[1] = author)
- "comparison" - 2 kolumny (content jako "Lewa | Prawa: opis")
- "cta" - call to action / closing

WAZNE: Slajdy musza tworzyc spojna narracje. Pierwszy = title, ostatni = cta lub podsumowanie. ${targetSlides} slajdow lacznie.`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
      }

      let fullText = ''
      let sentDone = false

      try {
        const anthropicStream = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 16000,
          stream: true,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        })

        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullText += event.delta.text
            send({ chunk: event.delta.text })
          }
        }

        const start = fullText.indexOf('{')
        const end = fullText.lastIndexOf('}')

        if (start === -1 || end === -1) {
          send({ error: 'Brak JSON' })
          sentDone = true
        } else {
          let clean = fullText.slice(start, end + 1)
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
          // Smart repair for truncated
          if (!parsed) {
            try {
              let repaired = fullText.slice(start)
              const lastValid = Math.max(repaired.lastIndexOf('}'), repaired.lastIndexOf(']'))
              if (lastValid > 0) repaired = repaired.slice(0, lastValid + 1)
              let openB = 0, openSq = 0, inStr = false, esc = false
              for (let i = 0; i < repaired.length; i++) {
                const ch = repaired[i]
                if (esc) { esc = false; continue }
                if (ch === '\\') { esc = true; continue }
                if (ch === '"') { inStr = !inStr; continue }
                if (inStr) continue
                if (ch === '{') openB++
                if (ch === '}') openB--
                if (ch === '[') openSq++
                if (ch === ']') openSq--
              }
              while (openSq > 0) { repaired += ']'; openSq-- }
              while (openB > 0) { repaired += '}'; openB-- }
              parsed = JSON.parse(repaired)
            } catch {}
          }

          if (parsed) {
            send({ done: true, data: parsed })
          } else {
            send({ error: 'Nie mozna sparsowac JSON' })
          }
          sentDone = true
        }
      } catch (err) {
        send({ error: err instanceof Error ? err.message : 'Blad' })
        sentDone = true
      }

      if (!sentDone) send({ error: 'Stream bez wyniku' })
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    }
  })
}
