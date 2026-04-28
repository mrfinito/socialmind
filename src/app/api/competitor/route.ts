import { NextRequest, NextResponse } from 'next/server'
import { checkGenerationLimit } from '@/lib/checkLimits'
import Anthropic from '@anthropic-ai/sdk'
import { repairAIJSON } from '@/lib/repairJSON'
import { checkAnthropicKey } from '@/lib/aiGuards'
import { tavilySearch, formatSearchForPrompt } from '@/lib/tavily'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 120


export async function POST(req: NextRequest) {
  const _envGuard = checkAnthropicKey()
  if (_envGuard) return _envGuard

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

    const { competitorUrl, competitorName, ourDNA, platforms, useSearch} = await req.json()

    const name = (competitorName || competitorUrl || 'konkurent').replace(/['"]/g, '')
    const ourBrand = ourDNA?.brandName || 'nasza marka'
    const ourIndustry = ourDNA?.industry || 'ogolna'
    const slug = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')

    const platformsToCheck: string[] = (platforms?.length ? platforms : ['facebook', 'instagram', 'linkedin']) as string[]

    // Map platform → domain for Tavily includeDomains filter
    const PLATFORM_DOMAINS: Record<string, string[]> = {
      facebook: ['facebook.com'],
      instagram: ['instagram.com'],
      linkedin: ['linkedin.com'],
      tiktok: ['tiktok.com'],
      x: ['x.com', 'twitter.com'],
      twitter: ['x.com', 'twitter.com'],
      youtube: ['youtube.com'],
      pinterest: ['pinterest.com'],
    }

    // Discovered real profile URLs per platform
    const realProfiles: Record<string, { url: string; title: string; preview: string }> = {}

    // ─── Tavily search: real profiles + general info ───
    let searchContext = ''
    let searchSources: Array<{title: string; url: string}> = []
    if (useSearch !== false && process.env.TAVILY_API_KEY && competitorName) {
      try {
        // Build per-platform search queries to find REAL profile URLs
        const profileSearches = platformsToCheck.map(platform => {
          const domains = PLATFORM_DOMAINS[platform.toLowerCase()] || []
          if (domains.length === 0) return null
          return tavilySearch(`${competitorName} oficjalny profil`, {
            maxResults: 2,
            searchDepth: 'basic',
            includeDomains: domains,
          }).then(result => ({ platform, result }))
        }).filter(Boolean) as Array<Promise<{ platform: string; result: Awaited<ReturnType<typeof tavilySearch>> }>>

        // General company info (separate query, no domain restriction)
        const generalSearch = tavilySearch(`${competitorName} firma branża ${ourIndustry}`, {
          maxResults: 4,
          searchDepth: 'basic',
        })

        const [generalRes, ...profileRes] = await Promise.all([generalSearch, ...profileSearches])

        // Extract first valid profile URL per platform
        for (const item of profileRes) {
          const { platform, result } = item
          const domains = PLATFORM_DOMAINS[platform.toLowerCase()] || []
          const firstMatch = result?.results.find(r => {
            try {
              const host = new URL(r.url).hostname.replace(/^www\./, '').toLowerCase()
              return domains.some(d => host === d || host.endsWith('.' + d))
            } catch { return false }
          })
          if (firstMatch) {
            // Filter out generic platform URLs (e.g. facebook.com/help, linkedin.com/jobs)
            const url = firstMatch.url
            const path = new URL(url).pathname
            const isGenericPath = /^\/(help|about|policies|terms|privacy|legal|jobs|business|developers|login|signup|search)/i.test(path) || path === '/' || path === ''
            if (!isGenericPath) {
              realProfiles[platform] = {
                url,
                title: firstMatch.title,
                preview: firstMatch.content.slice(0, 250),
              }
            }
          }
        }

        // Build context from general + profile previews
        const allResults = [
          ...(generalRes?.results || []),
          ...profileRes.flatMap(p => p.result?.results || []),
        ]
        if (allResults.length > 0) {
          searchContext = formatSearchForPrompt(allResults, { maxPerResult: 500, maxTotal: 4000 })
          searchSources = allResults.slice(0, 8).map(r => ({ title: r.title, url: r.url }))
        }
      } catch (searchErr) {
        console.warn('Competitor: search failed:', searchErr instanceof Error ? searchErr.message : searchErr)
      }
    }

    // Build per-platform JSON template, injecting REAL URLs where found
    const profilesJson = platformsToCheck.map(platform => {
      const real = realProfiles[platform.toLowerCase()]
      const profileUrl = real?.url || `https://${platform}.com/${slug}`
      const verified = !!real
      return `{"platform":"${platform}","profileUrl":"${profileUrl}","verified":${verified},"followers":"szacowana liczba np. 2400","postsPerWeek":3,"avgEngagement":"2.1%","contentFocus":"opis glownego contentu","lastActive":"aktywny","strength":"co robi dobrze","weakness":"co robi slabo"}`
    }).join(',')

    // Build "real profile context" section for the prompt
    const realProfilesSummary = Object.keys(realProfiles).length > 0
      ? '\n\nZNALEZIONE PRAWDZIWE PROFILE (URL juz wpisane w JSON, NIE zmieniaj ich):\n' +
        Object.entries(realProfiles).map(([p, info]) =>
          `- ${p}: ${info.url}\n  Tytul: ${info.title}\n  Tresc: ${info.preview}`
        ).join('\n\n')
      : ''

    const prompt = `Jestes ekspertem od analizy konkurencji i strategii social media.

Przeanalizuj konkurenta dla marki ${ourBrand} (branza: ${ourIndustry}).
Konkurent: ${name}
URL strony: ${competitorUrl || 'brak'}
Platformy do analizy: ${platformsToCheck.join(', ')}

${searchContext ? `═══ DANE ZE WYSZUKIWARKI ═══
Te informacje pochodza z aktualnych zrodel internetowych. Wykorzystaj je do REALNEJ analizy zamiast zgadywac.

${searchContext}

═══════════════════════════════` : 'Brak danych z wyszukiwarki - oprzyj analize na nazwie i ogolnych regulach branzowych.'}
${realProfilesSummary}

WAZNE - profile spolecznosciowe:
${Object.keys(realProfiles).length > 0
  ? '- Dla platform z prawdziwym URL (oznaczone "verified":true): profileUrl JEST JUZ WPISANY w szablonie JSON. Wpisz tylko followers/engagement/strength/weakness na podstawie tego co wiesz lub szacuj realistycznie. NIE zmieniaj profileUrl.'
  : '- Nie znaleziono prawdziwych profili. Zostaw profileUrl jako szacunkowy, ale ustaw "verified":false.'}
- Dla platform bez prawdziwego URL ("verified":false): zaznacz to jasno w polu "weakness" jako "Profil niepotwierdzony - mozliwe ze marka nie jest aktywna na tej platformie".

Na podstawie powyzszych danych wygeneruj realistyczna analize. Wykorzystuj prawdziwe dane gdzie sie pojawiaja.

Odpowiedz TYLKO czystym JSON:

{"socialProfiles":[${profilesJson}],"competitorProfile":{"estimatedNiche":"nisza i pozycjonowanie konkurenta w brancy ${ourIndustry}","estimatedTone":"ton komunikacji","estimatedStrengths":["sila 1","sila 2","sila 3"],"estimatedWeaknesses":["slabos 1","slabos 2"],"contentMix":{"educational":30,"promotional":40,"entertainment":20,"ugc":10},"overallSocialScore":62},"gaps":[{"gap":"Luka 1","description":"opis luki w strategii konkurenta","opportunity":"jak ${ourBrand} moze to wykorzystac"},{"gap":"Luka 2","description":"opis luki","opportunity":"jak wykorzystac"},{"gap":"Luka 3","description":"opis luki","opportunity":"jak wykorzystac"},{"gap":"Luka 4","description":"opis luki","opportunity":"jak wykorzystac"}],"differentiators":[{"area":"Obszar 1","theyDo":"co robi konkurent","weShouldDo":"co ${ourBrand} powinno robic inaczej"},{"area":"Obszar 2","theyDo":"co robi","weShouldDo":"co robic"},{"area":"Obszar 3","theyDo":"co robi","weShouldDo":"co robic"},{"area":"Obszar 4","theyDo":"co robi","weShouldDo":"co robic"}],"contentInsights":[{"insight":"Wniosek 1","action":"konkretna akcja"},{"insight":"Wniosek 2","action":"konkretna akcja"},{"insight":"Wniosek 3","action":"konkretna akcja"},{"insight":"Wniosek 4","action":"konkretna akcja"}],"recommendations":[{"priority":"wysoki","title":"Rekomendacja 1","description":"szczegoly","timeframe":"natychmiast"},{"priority":"sredni","title":"Rekomendacja 2","description":"szczegoly","timeframe":"1-2 tygodnie"},{"priority":"sredni","title":"Rekomendacja 3","description":"szczegoly","timeframe":"1-2 tygodnie"},{"priority":"niski","title":"Rekomendacja 4","description":"szczegoly","timeframe":"miesiac+"}],"swot":{"strengths":["nasza sila 1","nasza sila 2","nasza sila 3"],"weaknesses":["nasza slabos 1","nasza slabos 2"],"opportunities":["szansa 1","szansa 2"],"threats":["zagrozenie 1","zagrozenie 2"]},"summary":"Strategiczne podsumowanie analizy w 3-4 zdaniach konkretnie opisujace pozycje konkurenta i rekomendacje dla ${ourBrand}."}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5000,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    const { parsed, strategy } = repairAIJSON(rawText)

    if (!parsed) {
      console.error('Competitor: parse failed. Raw length:', rawText.length)
      console.error('Competitor: last 500 chars:', rawText.slice(-500))
      console.error('Competitor: stop_reason:', response.stop_reason)
      return NextResponse.json({
        error: response.stop_reason === 'max_tokens'
          ? 'AI zwróciło zbyt długą odpowiedź — spróbuj ponownie. Jeśli problem się powtórzy, wyłącz wyszukiwarkę dla tej analizy.'
          : 'Nie można przetworzyć odpowiedzi AI. Spróbuj ponownie lub użyj innej nazwy konkurenta.',
      }, { status: 500 })
    }

    console.log('Competitor: parsed via', strategy, '(stop_reason:', response.stop_reason, ')')
    return NextResponse.json({
      ok: true,
      data: parsed,
      _searchUsed: searchContext.length > 0,
      _sources: searchSources,
    })

  } catch (err) {
    console.error('Competitor error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad analizy konkurenta'
    }, { status: 500 })
  }
}
