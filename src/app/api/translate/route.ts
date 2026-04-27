import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkAnthropicKey } from '@/lib/aiGuards'
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const maxDuration = 120

const LANG_NAMES: Record<string, string> = {
  en: 'angielski', de: 'niemiecki', uk: 'ukrainski', cz: 'czeski',
  sk: 'slowacki', es: 'hiszpanski', fr: 'francuski', it: 'wloski', ru: 'rosyjski'
}

export async function POST(req: NextRequest) {
  const _envGuard = checkAnthropicKey()
  if (_envGuard) return _envGuard

  try {
    const { text, targetLanguages, dna, contentType } = await req.json()
    if (!text || !targetLanguages?.length) return NextResponse.json({ error: 'Brak danych' }, { status: 400 })

    const prompt = `Jestes tlumaczem specjalizujacym sie w marketingu i social media. Twoje tlumaczenia ZACHOWUJA ton marki, kontekst kulturowy, slang, idiomy - nie sa doslowne.

TEKST POLSKI:
"""${text.slice(0, 5000)}"""

TYP TRESCI: ${contentType || 'post social media'}
${dna ? `MARKA: ${dna.brandName} (${dna.industry}, ton: ${dna.tone})` : ''}

JEZYKI DOCELOWE: ${targetLanguages.map((l: string) => LANG_NAMES[l] || l).join(', ')}

Przetlumacz na kazdy jezyk + dodaj uwagi kulturowe. TYLKO JSON:
{
  "translations": [
    {
      "language": "en",
      "languageName": "angielski",
      "text": "Profesjonalne tlumaczenie zachowujace ton",
      "culturalNotes": "Co zmienilem dla rynku angielskiego i dlaczego",
      "warnings": "Czego unikac na tym rynku (jesli cos)",
      "alternativeVersion": "Alternatywna wersja jesli mozna pojsc inna droga"
    }
  ]
}

WAZNE: 
- Zachowaj hashtagi (przetlumacz jesli relewantne lokalnie)
- Uwzgledniaj rynek - to co dziala w PL nie zawsze dziala w innych krajach
- Zaznaczaj jesli cos jest kulturowo problematyczne na docelowym rynku`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    })
    const raw = response.content.map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '').join('')
    const start = raw.indexOf('{'), end = raw.lastIndexOf('}')
    if (start === -1) return NextResponse.json({ error: 'Brak JSON' }, { status: 500 })
    let clean = raw.slice(start, end+1)
    let parsed = null
    try { parsed = JSON.parse(clean) } catch {}
    if (!parsed) {
      clean = clean.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, m => m.replace(/\n/g, '\\n'))
      try { parsed = JSON.parse(clean) } catch {}
    }
    if (!parsed) return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad' }, { status: 500 })
  }
}
