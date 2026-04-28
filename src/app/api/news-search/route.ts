import { NextRequest, NextResponse } from 'next/server'
import { tavilySearch } from '@/lib/tavily'
import { errorResponse, safeJsonBody } from '@/lib/aiGuards'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    if (!process.env.TAVILY_API_KEY) {
      return NextResponse.json({
        ok: false,
        error: 'Wyszukiwanie w Google News wymaga skonfigurowania TAVILY_API_KEY na serwerze',
      }, { status: 503 })
    }

    const parsed = await safeJsonBody<{
      query: string
      days?: number
      maxResults?: number
      domains?: string[]  // optional: restrict to specific domains
    }>(req)
    if (parsed.response) return parsed.response

    const { query, days = 7, maxResults = 15, domains } = parsed.body

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query musi mieć co najmniej 2 znaki' }, { status: 400 })
    }

    const result = await tavilySearch(query, {
      topic: 'news',
      maxResults: Math.min(maxResults, 20),
      days,
      searchDepth: 'basic',
      includeDomains: domains,
    })

    if (!result) {
      return NextResponse.json({ ok: false, error: 'Wyszukiwarka niedostępna' }, { status: 503 })
    }

    // Adapt Tavily results to news item shape (compatible with /news UI)
    const items = result.results.map((r, i) => ({
      id: 'google-' + Buffer.from(r.url).toString('base64').slice(0, 16),
      title: r.title,
      link: r.url,
      description: r.content.slice(0, 300),
      pubDate: r.publishedDate || new Date().toISOString(),
      source: new URL(r.url).hostname.replace(/^www\./, ''),
      sourceId: 'google-news',
      category: 'google',
      score: r.score,
      _idx: i,
    }))

    return NextResponse.json({
      ok: true,
      items,
      query: result.query,
      responseTime: result.responseTime,
    })
  } catch (err) {
    return errorResponse(err, 'News search error')
  }
}
