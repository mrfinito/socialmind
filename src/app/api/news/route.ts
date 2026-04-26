import { NextRequest, NextResponse } from 'next/server'
import { RSS_SOURCES } from '@/lib/rssSources'

export const maxDuration = 60
export const runtime = 'nodejs'

interface NewsItem {
  id: string
  title: string
  link: string
  description: string
  pubDate: string
  source: string
  sourceId: string
  category: string
}

// Simple RSS/Atom parser using regex (no deps)
// Handles both <rss><channel><item>...</item></channel></rss>
// and <feed><entry>...</entry></feed> (Atom)
function parseRSS(xml: string, sourceName: string, sourceId: string, category: string): NewsItem[] {
  const items: NewsItem[] = []

  // Decode common HTML entities
  const decode = (s: string): string => s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/&#8230;/g, '…')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))

  // Strip HTML tags from description
  const stripTags = (s: string): string => decode(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

  const extract = (block: string, tag: string): string => {
    // Try CDATA first
    const cdata = new RegExp(`<${tag}[^>]*?>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i').exec(block)
    if (cdata) return cdata[1].trim()
    const m = new RegExp(`<${tag}[^>]*?>([\\s\\S]*?)</${tag}>`, 'i').exec(block)
    return m ? m[1].trim() : ''
  }

  const extractLink = (block: string): string => {
    // Atom: <link href="..."/>
    const atom = /<link[^>]*?href=["']([^"']+)["']/i.exec(block)
    if (atom) return atom[1]
    return extract(block, 'link')
  }

  // Try RSS items first
  const itemRegex = /<item[\s>][\s\S]*?<\/item>/gi
  const entryRegex = /<entry[\s>][\s\S]*?<\/entry>/gi
  
  const matches = xml.match(itemRegex) || xml.match(entryRegex) || []

  for (const block of matches.slice(0, 20)) {
    const title = stripTags(extract(block, 'title'))
    const link = extractLink(block).trim()
    let description = stripTags(extract(block, 'description') || extract(block, 'summary') || extract(block, 'content'))
    if (description.length > 400) description = description.slice(0, 400) + '...'
    const pubDate = extract(block, 'pubDate') || extract(block, 'published') || extract(block, 'updated') || ''
    
    if (!title || !link) continue

    items.push({
      id: `${sourceId}-${Buffer.from(link).toString('base64').slice(0, 16)}`,
      title,
      link,
      description: description || title,
      pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      source: sourceName,
      sourceId,
      category,
    })
  }

  return items
}

async function fetchSource(url: string, name: string, id: string, category: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SocialMindBot/1.0; +https://socialmindapp.vercel.app)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseRSS(xml, name, id, category)
  } catch {
    return []
  }
}

export async function POST(req: NextRequest) {
  const { sourceIds, customSources, limit = 50 } = await req.json() as {
    sourceIds?: string[]
    customSources?: Array<{ name: string; rss: string }>
    limit?: number
  }

  // Build list of sources to fetch
  const targets: Array<{ url: string; name: string; id: string; category: string }> = []
  
  if (sourceIds?.length) {
    for (const id of sourceIds) {
      const src = RSS_SOURCES.find(s => s.id === id)
      if (src) targets.push({ url: src.rss, name: src.name, id: src.id, category: src.category })
    }
  }
  
  if (customSources?.length) {
    for (const cs of customSources) {
      if (!cs.rss?.startsWith('http')) continue
      targets.push({
        url: cs.rss,
        name: cs.name || new URL(cs.rss).hostname,
        id: 'custom-' + Buffer.from(cs.rss).toString('base64').slice(0, 12),
        category: 'custom',
      })
    }
  }

  if (targets.length === 0) {
    return NextResponse.json({ ok: false, error: 'Brak źródeł' }, { status: 400 })
  }

  // Fetch all in parallel with concurrency limit (max 8 simultaneous)
  const results: NewsItem[] = []
  const failed: string[] = []
  
  const chunks: typeof targets[] = []
  for (let i = 0; i < targets.length; i += 8) chunks.push(targets.slice(i, i + 8))
  
  for (const chunk of chunks) {
    const settled = await Promise.allSettled(
      chunk.map(t => fetchSource(t.url, t.name, t.id, t.category))
    )
    settled.forEach((s, i) => {
      if (s.status === 'fulfilled' && s.value.length > 0) {
        results.push(...s.value)
      } else {
        failed.push(chunk[i].name)
      }
    })
  }

  // Deduplicate by URL
  const seen = new Set<string>()
  const deduped = results.filter(r => {
    if (seen.has(r.link)) return false
    seen.add(r.link)
    return true
  })

  // Sort by date, newest first
  deduped.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  return NextResponse.json({
    ok: true,
    items: deduped.slice(0, limit),
    total: deduped.length,
    failed,
    fetchedSources: targets.length - failed.length,
  })
}
