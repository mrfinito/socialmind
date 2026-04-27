import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { robustParse } from '@/lib/parseJSON'
import { checkAnthropicKey } from '@/lib/aiGuards'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const _envGuard = checkAnthropicKey()
  if (_envGuard) return _envGuard

  const limit = await checkGenerationLimit()
  if (!limit.allowed) return NextResponse.json({ error: limit.reason }, { status: 429 })

  const { article, dna, projectName } = await req.json() as {
    article: { title: string; description: string; link: string; source: string; pubDate?: string }
    dna?: { brandName?: string; industry?: string; tone?: string; audience?: string; values?: string | string[] }
    projectName?: string
  }

  if (!article?.title) {
    return NextResponse.json({ error: 'Brak artykulu' }, { status: 400 })
  }

  const brand = dna?.brandName || projectName || 'marka klienta'
  const industry = dna?.industry || ''
  const audience = dna?.audience || ''

  const prompt = `Jestes senior strategiem marketingowym w polskiej agencji reklamowej. Pomagasz klientom zrozumiec jak nowinki branzowe wplywaja na ich biznes.

ARTYKUL:
Tytul: ${article.title}
Zrodlo: ${article.source}
${article.description ? `Opis: ${article.description.slice(0, 500)}` : ''}
Link: ${article.link}

KLIENT/MARKA: ${brand}
${industry ? `BRANZA: ${industry}` : ''}
${audience ? `GRUPA DOCELOWA: ${audience}` : ''}

Zwroc TYLKO JSON bez markdown:
{
  "relevance": 75,
  "summary": "2-3 zdania syntezujace o czym jest artykul",
  "whyItMatters": "Konkretnie dlaczego to istotne dla ${brand} - 2-3 zdania",
  "implications": [
    "Konkretny wplyw 1 - np. zmiana zachowan konsumentow",
    "wplyw 2",
    "wplyw 3"
  ],
  "actions": {
    "immediate": ["Co zrobic teraz - 1-2 dzialania"],
    "shortTerm": ["W ciagu miesiaca - 1-2 dzialania"],
    "strategic": ["Dlugofalowo - 1 dzialanie"]
  },
  "contentIdeas": [
    {
      "format": "post|reels|artykul|stories",
      "title": "Pomysl na post nawiazujacy do tej wiadomosci",
      "angle": "Jaki kat wziecia tego tematu",
      "hook": "Pierwsza linijka posta"
    },
    {"format":"...","title":"...","angle":"...","hook":"..."}
  ],
  "risks": ["Potencjalne ryzyko 1 (jesli sa)"],
  "tags": ["tag1","tag2","tag3"]
}

Score "relevance" 0-100: jak istotny artykul dla tej konkretnej marki/branzy. Bardzo wazne aby bylo szczerze - jesli artykul slabo dotyczy marki, daj 30. Jesli totalnie kluczowy - 90+.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }]
  })

  const raw = response.content
    .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
    .join('')
  const parsed = robustParse(raw)
  if (!parsed) return NextResponse.json({ error: 'Blad parsowania' }, { status: 500 })
  return NextResponse.json({ ok: true, data: parsed })
}
