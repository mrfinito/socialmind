import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { robustParse } from '@/lib/parseJSON'
import { checkAnthropicKey } from '@/lib/aiGuards'
import { tavilySearch, formatSearchForPrompt } from '@/lib/tavily'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const _envGuard = checkAnthropicKey()
  if (_envGuard) return _envGuard

  const limit = await checkGenerationLimit()
  if (!limit.allowed) return NextResponse.json({ error: limit.reason }, { status: 429 })

  const { period, projectName, posts, kpi, plans, dna, agencyName } = await req.json() as {
    period: string  // "Kwiecień 2026"
    projectName: string
    agencyName?: string
    posts?: Array<{ topic: string; platform: string; performance?: string }>
    kpi?: { reach?: string; engagement?: string; followers?: string; conversions?: string; notes?: string }
    plans?: string  // co planujemy
    dna?: { brandName?: string; tone?: string; industry?: string }
  }

  const tone = dna?.tone || 'profesjonalny'
  const agencyDisplay = agencyName || 'Twoja agencja'

  const system = `Jestes senior account managerem w agencji social media. Tworzysz miesieczne newslettery dla klientow ktore:
- Pokazuja wartosc agencji w jasny sposob
- Sa profesjonalne ale ciepie (relacja klient-agencja)
- Maja klarowne sekcje
- Konczyly sie konkretnym call to action / planem

Newsletter sklada sie z sekcji w naturalnym przeplywie.

Odpowiadasz WYLACZNIE poprawnym JSON.`

  // ─── Tavily: industry news for "Co się dzieje w branży" section ───
  let industryNews = ''
  if (process.env.TAVILY_API_KEY && dna?.industry) {
    try {
      const news = await tavilySearch(`najwazniejsze newsy ${dna.industry} branza`, {
        topic: 'news', maxResults: 5, days: 30,
      })
      if (news?.results?.length) {
        industryNews = formatSearchForPrompt(news.results, { maxPerResult: 350, maxTotal: 2500 })
      }
    } catch (e) {
      console.warn('Newsletter: search failed:', e instanceof Error ? e.message : e)
    }
  }

  const prompt = `STWORZ MIESIECZNY NEWSLETTER dla klienta agencji.

OKRES: ${period}
KLIENT: ${projectName}
AGENCJA: ${agencyDisplay}
TON: ${tone}

${posts?.length ? `POSTY w tym miesiacu (${posts.length}):\n${posts.slice(0, 20).map(p => `- ${p.platform}: ${p.topic}${p.performance ? ` (${p.performance})` : ''}`).join('\n')}` : 'Brak danych o postach'}

${kpi ? `KPI:
${kpi.reach ? `Zasieg: ${kpi.reach}` : ''}
${kpi.engagement ? `Engagement: ${kpi.engagement}` : ''}
${kpi.followers ? `Obserwujacy: ${kpi.followers}` : ''}
${kpi.conversions ? `Konwersje: ${kpi.conversions}` : ''}
${kpi.notes ? `Notatki: ${kpi.notes}` : ''}` : ''}

${plans ? `PLANY na nastepny miesiac: ${plans}` : ''}
${industryNews ? `
═══ AKTUALNE NEWSY BRANZOWE (ostatnie 30 dni) ═══
Wykorzystaj te informacje do sekcji o trendach/branzy w newsletterze. Linkuj do zrodel gdy mozliwe.

${industryNews}

═════════════════════════════════════════════════
` : ''}

JSON:
{
  "subject": "Email subject - chwytliwy ale profesjonalny",
  "preheader": "Preview text 50-100 znakow",
  "greeting": "Witam Pana X / Czesc Marek - dopasowane do tonu",
  "intro": "Krotki paragraph wprowadzajacy - 2-3 zdania",
  "sections": [
    {
      "id": "highlights",
      "title": "🎯 Highlights miesiaca",
      "content": "Najwazniejsze osiagniecia w prozie - 3-4 zdania",
      "bullets": ["Pierwszy highlight", "Drugi", "Trzeci"]
    },
    {
      "id": "kpi",
      "title": "📊 Wyniki",
      "content": "Komentarz do KPI",
      "stats": [
        { "label": "Zasieg", "value": "150K", "change": "+23%", "direction": "up" },
        { "label": "Engagement", "value": "4.2%", "change": "+0.8pp", "direction": "up" },
        { "label": "Followers", "value": "+340", "change": "+5%", "direction": "up" }
      ]
    },
    {
      "id": "best-content",
      "title": "🏆 Najlepsze tresci",
      "content": "Co zadzialalo i dlaczego",
      "bullets": ["Post 1: ...", "Post 2: ..."]
    },
    {
      "id": "insights",
      "title": "💡 Insights & nauki",
      "content": "Co dowiedzielismy sie o audience i co z tego wynika",
      "bullets": ["Insight 1", "Insight 2"]
    },
    {
      "id": "next-month",
      "title": "🚀 Plan na nastepny miesiac",
      "content": "Co planujemy i dlaczego",
      "bullets": ["Akcja 1", "Akcja 2", "Akcja 3"]
    }
  ],
  "callout": {
    "type": "info|success|warning",
    "title": "Krotkie przypomnienie / wazna informacja",
    "text": "Tekst calloutu"
  },
  "cta": {
    "text": "Umow rozmowe podsumowujaca",
    "buttonText": "Zarezerwuj termin",
    "buttonUrl": "{{calendar_link}}"
  },
  "closing": "Pozdrawiamy serdecznie",
  "signature": "Zespol ${agencyDisplay}"
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system,
    messages: [{ role: 'user', content: prompt }]
  })

  const raw = response.content
    .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '').join('')

  const parsed = robustParse(raw)
  if (!parsed) return NextResponse.json({ error: 'Blad parsowania' }, { status: 500 })
  return NextResponse.json({ ok: true, data: parsed })
}
