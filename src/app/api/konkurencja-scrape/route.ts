import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const maxDuration = 180

// Najprostsze: użyj Claude do "interpretacji" publicznych URL przez web search lub bezpośrednie fetch publicznych stron
// Większość social media wymaga cookies/auth, ale niektóre profile mają public preview meta-tagi

interface ScrapedPost {
  preview: string
  date?: string
  engagement?: string
}

async function fetchPublicPreview(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SocialMindBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return ''
    const html = await res.text()
    // Extract meta tags and visible text snippets (first 8KB)
    const ogDescription = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)?.[1] || ''
    const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1] || ''
    const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1] || ''
    
    // Extract any visible content snippets (rough)
    const textMatches = html.match(/<(?:p|h[1-6]|span|div)[^>]*>([^<]{30,500})</gi)?.slice(0, 30) || []
    const textContent = textMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(t => t.length > 30).join('\n')
    
    return `Title: ${ogTitle}\nDescription: ${ogDescription || description}\n\nContent snippets:\n${textContent.slice(0, 4000)}`
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const { competitorUrl, competitorName, industry } = await req.json()
    if (!competitorUrl) return NextResponse.json({ error: 'Brak URL' }, { status: 400 })

    // Try to fetch what we can publicly
    const publicData = await fetchPublicPreview(competitorUrl)
    
    const platform = competitorUrl.includes('instagram') ? 'Instagram' :
                     competitorUrl.includes('facebook') ? 'Facebook' :
                     competitorUrl.includes('linkedin') ? 'LinkedIn' :
                     competitorUrl.includes('tiktok') ? 'TikTok' :
                     competitorUrl.includes('twitter') || competitorUrl.includes('x.com') ? 'Twitter/X' :
                     competitorUrl.includes('youtube') ? 'YouTube' : 'Web'

    const hasRealData = publicData.length > 200

    const prompt = `Jestes analitykiem konkurencji w marketingu social media. ${hasRealData ? 'Otrzymujesz fragmenty publicznie dostepnych tresci. Zanalizuj je i wyciagnij maksimum wartosci.' : 'Niestety platforma blokuje publiczny dostep do tresci postow. Wygeneruj analize na podstawie nazwy konkurenta i branzy - dasz strategiczne wskazowki bazujace na typowych wzorcach branzowych.'}

KONKURENT: ${competitorName || 'Profil'}
URL: ${competitorUrl}
PLATFORMA: ${platform}
BRANZA: ${industry || 'nieokreslona'}

${hasRealData ? `\nDANE PUBLICZNE Z PROFILU:\n${publicData}` : '\nUWAGA: Brak publicznych danych - generuj analize bazujac na nazwie konkurenta i typowych wzorcach.'}

Zwroc TYLKO JSON:
{
  "scrapedSuccessfully": ${hasRealData},
  "competitorName": "${competitorName || 'Konkurent'}",
  "platform": "${platform}",
  "summary": "1-2 zdania o tym co robi konkurent (na podstawie zebranych danych)",
  "contentPillars": ["Filar treści 1", "Filar 2", "Filar 3"],
  "voiceAndTone": "Opis tonu komunikacji konkurenta",
  "postingPatterns": {
    "frequency": "Sugerowana czestotliwosc publikacji",
    "bestTimes": "Najlepsze godziny",
    "contentMix": "Mix content (% video / static / story)"
  },
  "topicsThatWork": ["Temat 1 ktory u nich dziala", "Temat 2", "Temat 3", "Temat 4"],
  "weaknesses": ["Slabosc 1 - co mozemy wykorzystac", "Slabosc 2", "Slabosc 3"],
  "opportunities": [
    { "opportunity": "Mozliwosc 1", "howToExploit": "Jak ja wykorzystac" },
    { "opportunity": "Mozliwosc 2", "howToExploit": "Jak" }
  ],
  "differentiators": ["Co ich wyrozinia 1", "Co 2"],
  "actionableInsights": [
    { "insight": "Wniosek 1", "action": "Co Ty mozesz z tym zrobic" }
  ],
  "warnings": "${hasRealData ? '' : 'Analiza wygenerowana bez dostepu do realnych postow. Podlacz Brand24/Sotrender lub uzyj rezynego profilu z publicznym RSS dla dokladniejszych danych.'}"
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 6000,
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
