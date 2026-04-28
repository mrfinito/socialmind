// Tavily Search API wrapper - https://docs.tavily.com
// Free tier: 1000 searches/month, then $0.008/search.
// API key: set TAVILY_API_KEY in env.
//
// Tavily is built specifically for LLM agents — returns structured JSON
// with full page content (not just snippets), perfect for RAG.

export interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
  publishedDate?: string
  rawContent?: string
}

export interface TavilyResponse {
  query: string
  answer?: string  // Tavily's own AI summary if includeAnswer=true
  results: TavilySearchResult[]
  responseTime: number
  images?: string[]
}

interface TavilyOptions {
  searchDepth?: 'basic' | 'advanced'  // 'advanced' = better quality, slower, costs 2 credits
  topic?: 'general' | 'news'           // 'news' for fresh content
  maxResults?: number                  // 1-20, default 5
  includeAnswer?: boolean              // include AI summary
  includeRawContent?: boolean          // include full page HTML→text
  includeDomains?: string[]            // restrict to these domains
  excludeDomains?: string[]            // exclude these
  days?: number                        // for news topic: last N days
  timeoutMs?: number                   // request timeout (default 25s)
  minScore?: number                    // filter out results with relevance score below this (0-1, default 0.3)
}

/**
 * Performs a Tavily search.
 * Returns null if TAVILY_API_KEY is missing (so the caller can fallback gracefully).
 * Throws on actual API errors with a clean message.
 */
export async function tavilySearch(
  query: string,
  options: TavilyOptions = {}
): Promise<TavilyResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    console.warn('TAVILY_API_KEY not set - search disabled')
    return null
  }

  const {
    searchDepth = 'basic',
    topic = 'general',
    maxResults = 5,
    includeAnswer = false,
    includeRawContent = false,
    includeDomains,
    excludeDomains,
    days,
    timeoutMs = 25000,
    minScore = 0.3,  // filter low-relevance results by default
  } = options

  const body: Record<string, unknown> = {
    api_key: apiKey,
    query: query.slice(0, 400),  // Tavily limit
    search_depth: searchDepth,
    topic,
    max_results: Math.min(Math.max(maxResults, 1), 20),
    include_answer: includeAnswer,
    include_raw_content: includeRawContent,
  }
  if (includeDomains?.length) body.include_domains = includeDomains
  if (excludeDomains?.length) body.exclude_domains = excludeDomains
  if (topic === 'news' && days) body.days = days

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      if (res.status === 401) throw new Error('Tavily: nieprawidłowy API key')
      if (res.status === 429) throw new Error('Tavily: przekroczono limit zapytań (1000/mies free, $0.008/zapytanie powyżej)')
      throw new Error(`Tavily API ${res.status}: ${errText.slice(0, 200)}`)
    }

    const data = await res.json() as {
      query: string
      answer?: string
      results: Array<{
        title: string
        url: string
        content: string
        score: number
        published_date?: string
        raw_content?: string
      }>
      response_time: number
      images?: string[]
    }

    const filteredResults = (data.results || [])
      .filter(r => r.score >= minScore)  // drop low-relevance noise
      .map(r => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
        publishedDate: r.published_date,
        rawContent: r.raw_content,
      }))

    // Log if filter removed results (helps tuning threshold)
    const filteredOut = (data.results || []).length - filteredResults.length
    if (filteredOut > 0) {
      console.log(`Tavily: filtered out ${filteredOut} low-score results (<${minScore}) for query: "${query.slice(0, 60)}"`)
    }

    return {
      query: data.query,
      answer: data.answer,
      results: filteredResults,
      responseTime: data.response_time,
      images: data.images,
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Tavily: timeout (>25s)')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Helper: format Tavily results as compact context string for AI prompts.
 * Limits each result to ~500 chars, total ~3000 chars by default.
 */
export function formatSearchForPrompt(
  results: TavilySearchResult[],
  options: { maxPerResult?: number; maxTotal?: number } = {}
): string {
  const { maxPerResult = 500, maxTotal = 3000 } = options
  if (!results.length) return ''

  let total = ''
  for (const r of results) {
    const date = r.publishedDate ? ` (${r.publishedDate.slice(0, 10)})` : ''
    const snippet = r.content.slice(0, maxPerResult)
    const block = `[${r.title}${date}]\n${snippet}\nŹródło: ${r.url}\n\n`
    if (total.length + block.length > maxTotal) break
    total += block
  }
  return total.trim()
}
