import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 120

interface ChatMessage { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Nie zalogowany' }), { status: 401 })

    const { messages, context } = await req.json() as {
      messages: ChatMessage[]
      context: {
        brandName?: string
        industry?: string
        dna?: unknown
        recentPosts?: unknown[]
        strategy?: unknown
        recentRtm?: unknown
      }
    }

    const systemPrompt = `Jestes senior strategiem komunikacji w agencji reklamowej z 15-letnim doswiadczeniem na polskim rynku. Pomagasz zespolowi agencji w podejmowaniu decyzji strategicznych, tworzeniu contentu i rozwiazywaniu problemow komunikacyjnych.

Charakterystyka:
- Odpowiadasz konkretnie, bez wody
- Dajesz rzeczowe porady poparte uzasadnieniem
- Znasz polski rynek i kontekst kulturowy
- Potrafisz zaproponowac 2-3 warianty rozwiazania
- Jestes bezposredni ale empatyczny
- Kiedy czegos nie wiesz - mowisz szczerze

${context?.brandName ? `KONTEKST PROJEKTU:
Marka: ${context.brandName}
Branza: ${context.industry || 'nie podano'}
${context.dna ? `Brand DNA: ${JSON.stringify(context.dna).slice(0, 1500)}` : ''}
${context.strategy ? `Strategia: ${JSON.stringify(context.strategy).slice(0, 1500)}` : ''}
${context.recentPosts?.length ? `Ostatnie posty: ${context.recentPosts.length} postow w systemie` : ''}
` : 'Brak kontekstu projektu - odpowiadaj na podstawie pytan uzytkownika.'}

Uzywaj emoji oszczednie (max 2 na odpowiedz). Formatuj odpowiedzi w czytelny sposob uzywajac list tam gdzie ma to sens.`

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
        }

        try {
          const anthropicStream = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2000,
            stream: true,
            system: systemPrompt,
            messages: messages.map(m => ({ role: m.role, content: m.content }))
          })

          let fullText = ''
          for await (const event of anthropicStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text
              send({ chunk: event.delta.text })
            }
          }
          send({ done: true, fullText })
        } catch (err) {
          send({ error: err instanceof Error ? err.message : 'Blad' })
        }
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
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Blad' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}
