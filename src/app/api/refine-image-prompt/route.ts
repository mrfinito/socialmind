import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { idea, style, mood } = await req.json() as {
      idea: string
      style?: string
      mood?: string
    }

    if (!idea || idea.trim().length < 5) {
      return NextResponse.json({ error: 'Pomysł jest zbyt krótki' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Jestes ekspertem od promptow do generatorow obrazow AI (DALL-E 3, Gemini Nano Banana). Zamien pomysl uzytkownika na profesjonalny, szczegolowy prompt po angielsku.

POMYSL UZYTKOWNIKA:
${idea}

${style ? `STYL WIZUALNY: ${style}` : ''}
${mood ? `NASTROJ/MOOD: ${mood}` : ''}

ZASADY DOBREGO PROMPTU:
- Po angielsku
- Bardzo opisowy wizualnie - kompozycja, perspektywa, oswietlenie, kolory
- Konkretne style fotograficzne lub artystyczne (np. "commercial photography", "editorial style", "minimalist illustration")
- Detale techniczne (np. "shallow depth of field", "natural lighting", "cinematic composition")
- BEZ zadnego tekstu/napisow w obrazie
- Bez nadmiaru przymiotnikow

Zwroc TYLKO sam prompt, bez wstepu, bez wyjasnien, bez cudzyslowiow.`
      }]
    })

    const promptText = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')
      .trim()
      .replace(/^["']|["']$/g, '')

    return NextResponse.json({ ok: true, prompt: promptText })
  } catch (err) {
    console.error('Refine prompt error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Błąd' }, { status: 500 })
  }
}
