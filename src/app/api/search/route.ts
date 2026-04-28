import { NextRequest, NextResponse } from 'next/server'
import { tavilySearch } from '@/lib/tavily'
import { errorResponse, safeJsonBody } from '@/lib/aiGuards'
import { checkGenerationLimit } from '@/lib/checkLimits'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const limit = await checkGenerationLimit()
    if (!limit.allowed) {
      return NextResponse.json({ error: limit.reason }, { status: 429 })
    }

    const parsed = await safeJsonBody<{
      query: string
      mode?: 'general' | 'news'
      maxResults?: number
      depth?: 'basic' | 'advanced'
      domains?: string[]
      excludeDomains?: string[]
      days?: number
      includeAnswer?: boolean
    }>(req)
    if (parsed.response) return parsed.response

    const { query, mode = 'general', maxResults = 5, depth = 'basic', domains, excludeDomains, days, includeAnswer = false } = parsed.body

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query musi mieć co najmniej 2 znaki' }, { status: 400 })
    }

    if (!process.env.TAVILY_API_KEY) {
      return NextResponse.json({
        error: 'Wyszukiwarka nie jest skonfigurowana. Dodaj TAVILY_API_KEY w Vercel Environment Variables (zobacz docs/SEARCH_SETUP.md).',
      }, { status: 503 })
    }

    const result = await tavilySearch(query, {
      topic: mode,
      maxResults,
      searchDepth: depth,
      includeDomains: domains,
      excludeDomains,
      days,
      includeAnswer,
    })

    if (!result) {
      return NextResponse.json({ error: 'Wyszukiwarka niedostępna' }, { status: 503 })
    }

    return NextResponse.json({
      ok: true,
      query: result.query,
      answer: result.answer,
      results: result.results,
      responseTime: result.responseTime,
    })
  } catch (err) {
    return errorResponse(err, 'Search error')
  }
}
