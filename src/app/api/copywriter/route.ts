import { NextRequest, NextResponse } from 'next/server'
import { checkGenerationLimit } from '@/lib/checkLimits'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

    const { messages, dna, platform, history } = await req.json()

    const systemPrompt = `Jestes AI Copywriterem dla marki. Twoje zadanie to pisanie i iterowanie tekstow social media.

${dna ? `BRAND DNA — ZAWSZE sie tym kieruj:
Marka: ${dna.brandName || 'Marka'}
Branza: ${dna.industry || ''}
Persona klienta: ${dna.persona || ''}
Wartosci: ${dna.values || ''}
USP: ${dna.usp || ''}
Ton komunikacji: ${dna.tone || ''}
Slowa kluczowe: ${dna.keywords || ''}
Master prompt: ${dna.masterPrompt || ''}` : 'Brak Brand DNA — dzialaj jako ogolny copywriter.'}

Aktualna platforma: ${platform || 'ogolna'}

ZASADY:
- Odpowiadaj krotko i konkretnie — jestes asystentem w chacie, nie generujesz raportu
- Gdy piszesz post: podaj sam tekst, bez dluich wstepow
- Gdy user prosi o wersje/warianty: numeruj je (1. 2. 3.)
- Gdy user prosi o skrocenie/wydluzenie/zmiane tonu: od razu podaj poprawiony tekst
- Pamietaj kontekst rozmowy — user nie musi powtarzac
- Mozesz sugerowac hashtagi, emoji, CTA ale nie narzucaj
- Jezyk: polski, chyba ze user pisze po angielsku`

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages.map((m: {role: string; content: string}) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    })

    const text = response.content
      .map((b: {type: string; text?: string}) => b.type === 'text' ? b.text : '')
      .join('')

    return NextResponse.json({ ok: true, text, usage: response.usage })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Błąd copywritera' }, { status: 500 })
  }
}
