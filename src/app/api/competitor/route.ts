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

    // ─── Strict matching helpers ───
    // Normalize text: lowercase, no diacritics, no spaces/punctuation
    const normalize = (s: string): string =>
      s.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/[^a-z0-9]/g, '')

    // Generate name variants for fuzzy matching
    const nameNorm = normalize(competitorName || '')
    const nameTokens = (competitorName || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/[\s\-_.&]+/)
      .filter((t: string) => t.length >= 3) // ignore short words

    // Check if a profile URL/title actually mentions the brand
    const profileMatchesBrand = (url: string, title: string, _content: string): boolean => {
      if (nameTokens.length === 0) return false

      // Extract path segment from URL (e.g. facebook.com/CocaColaPL → "cocacolapl")
      let pathSlug = ''
      try {
        const u = new URL(url)
        // Get first meaningful path segment
        const segments = u.pathname.split('/').filter(Boolean)
        // For LinkedIn: company/{slug}, for FB/IG/TikTok: just /{slug}
        pathSlug = normalize(segments[segments.length - 1] || segments[0] || '')
      } catch { return false }

      const titleNorm = normalize(title)

      // Strong signal: brand name (full or token) appears in URL path
      const urlContainsBrand = nameNorm.length >= 4 && pathSlug.includes(nameNorm.slice(0, Math.min(nameNorm.length, 12)))

      // Or: at least 1 brand token (length >=4) appears in URL path
      const significantTokens = nameTokens.filter((t: string) => t.length >= 4)
      const urlContainsToken = significantTokens.length > 0 &&
        significantTokens.some((t: string) => pathSlug.includes(normalize(t)))

      // Or: brand name appears in title (less strong but still good)
      const titleContainsBrand = nameNorm.length >= 4 && titleNorm.includes(nameNorm.slice(0, Math.min(nameNorm.length, 12)))

      // Require URL match (strongest signal) OR title match
      // The content match alone is too weak — pages can mention brands they're not about
      return urlContainsBrand || urlContainsToken || titleContainsBrand
    }

    // Discovered real profile URLs per platform (only verified matches)
    const realProfiles: Record<string, { url: string; title: string; preview: string }> = {}
    // Profiles that were searched but no good match found
    const notFoundPlatforms: string[] = []

    // ─── Tavily search: real profiles + general info ───
    let searchContext = ''
    let searchSources: Array<{title: string; url: string}> = []
    if (useSearch !== false && process.env.TAVILY_API_KEY && competitorName) {
      try {
        // Build per-platform search queries — try TWO queries per platform for better recall
        // because Tavily's includeDomains filter sometimes misses the obvious profile
        const profileSearches = platformsToCheck.map(platform => {
          const domains = PLATFORM_DOMAINS[platform.toLowerCase()] || []
          if (domains.length === 0) return null
          // Two parallel queries with different phrasings (Tavily can return different results)
          const queries = [
            `${competitorName}`,                  // simplest - just the name
            `${competitorName} ${platform}`,       // name + platform name (English)
          ]
          return Promise.all(
            queries.map(q => tavilySearch(q, {
              maxResults: 5,
              searchDepth: 'basic',
              includeDomains: domains,
            }))
          ).then(results => ({
            platform,
            // Merge all results, dedupe by URL
            result: {
              results: Array.from(
                new Map(
                  results
                    .flatMap(r => r?.results || [])
                    .map(r => [r.url, r])
                ).values()
              )
            }
          }))
        }).filter(Boolean) as Array<Promise<{ platform: string; result: { results: Array<{ url: string; title: string; content: string; score: number }> } }>>

        // General company info (separate query, no domain restriction)
        const generalSearch = tavilySearch(`${competitorName} firma branża ${ourIndustry}`, {
          maxResults: 4,
          searchDepth: 'basic',
        })

        const [generalRes, ...profileRes] = await Promise.all([generalSearch, ...profileSearches])

        // Score threshold: Tavily returns relevance 0-1, only accept >=0.3 (relaxed)
        const SCORE_THRESHOLD = 0.3

        for (const item of profileRes) {
          const { platform, result } = item
          if (!result?.results?.length) {
            notFoundPlatforms.push(platform)
            continue
          }

          const platformDomains = PLATFORM_DOMAINS[platform.toLowerCase()] || []

          // Filter results: must be from correct domain, decent score, not generic, AND match brand
          const candidates = result.results.filter(r => {
            // 1. Correct domain
            try {
              const host = new URL(r.url).hostname.replace(/^www\./, '').toLowerCase()
              if (!platformDomains.some(d => host === d || host.endsWith('.' + d))) return false
            } catch { return false }

            // 2. Score threshold
            if (r.score < SCORE_THRESHOLD) return false

            // 3. Not generic path
            try {
              const path = new URL(r.url).pathname
              const isGenericPath = /^\/(help|about|policies|terms|privacy|legal|jobs|business|developers|login|signup|search|posts|share|watch|videos|reels|stories|hashtag|explore|tag)/i.test(path) || path === '/' || path === ''
              if (isGenericPath) return false
            } catch { return false }

            // 4. STRICT: brand name must actually appear in URL or title
            return profileMatchesBrand(r.url, r.title, r.content)
          })

          if (candidates.length > 0) {
            // Take highest-scoring match
            const best = candidates.sort((a, b) => b.score - a.score)[0]
            realProfiles[platform] = {
              url: best.url,
              title: best.title,
              preview: best.content.slice(0, 250),
            }
          } else {
            notFoundPlatforms.push(platform)
          }
        }

        // Build context from general + matched profiles only
        const allResults = [
          ...(generalRes?.results || []),
          ...Object.values(realProfiles).map(p => ({ title: p.title, url: p.url, content: p.preview, score: 1, publishedDate: undefined })),
        ]
        if (allResults.length > 0) {
          searchContext = formatSearchForPrompt(allResults, { maxPerResult: 500, maxTotal: 4000 })
          searchSources = allResults.slice(0, 8).map(r => ({ title: r.title, url: r.url }))
        }
      } catch (searchErr) {
        console.warn('Competitor: search failed:', searchErr instanceof Error ? searchErr.message : searchErr)
      }
    }

    // Build per-platform JSON template, injecting REAL URLs where found, null otherwise
    const profilesJson = platformsToCheck.map(platform => {
      const real = realProfiles[platform.toLowerCase()]
      if (real) {
        // Verified profile from Tavily — inject URL with verified:true
        return `{"platform":"${platform}","profileUrl":"${real.url}","verified":true,"followers":"szacowana liczba np. 2400","postsPerWeek":3,"avgEngagement":"2.1%","contentFocus":"opis glownego contentu","lastActive":"aktywny","strength":"co robi dobrze","weakness":"co robi slabo"}`
      } else {
        // Not found — DO NOT make up a URL, leave it null
        return `{"platform":"${platform}","profileUrl":null,"verified":false,"followers":"nieznane","postsPerWeek":0,"avgEngagement":"nieznane","contentFocus":"Nie znaleziono profilu - mozliwe ze marka nie jest aktywna na tej platformie","lastActive":"nieznane","strength":"nie do oceny bez dostepu do profilu","weakness":"profil nieznaleziony lub marka nie ma konta"}`
      }
    }).join(',')

    // Build "real profile context" section for the prompt
    const realProfilesSummary = Object.keys(realProfiles).length > 0
      ? '\n\nZNALEZIONE PRAWDZIWE PROFILE (URL juz wpisane w JSON, NIE zmieniaj ich):\n' +
        Object.entries(realProfiles).map(([p, info]) =>
          `- ${p}: ${info.url}\n  Tytul: ${info.title}\n  Tresc: ${info.preview}`
        ).join('\n\n')
      : ''

    const notFoundSummary = notFoundPlatforms.length > 0
      ? `\n\nNIE ZNALEZIONO PROFILI dla: ${notFoundPlatforms.join(', ')}. Te platformy maja "profileUrl":null i "verified":false. NIE wypelniaj ich szacunkowymi danymi - zostaw pola pokazujace ze profil nie zostal znaleziony.`
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
${realProfilesSummary}${notFoundSummary}

KRYTYCZNE ZASADY ANALIZY:

1. PROFILE OZNACZONE "verified":true (z URL):
   - To PRAWDZIWE profile znalezione w internecie
   - Mozesz wypelnic followers/engagement na podstawie wyszukiwania
   - NIE zmieniaj profileUrl

2. PROFILE OZNACZONE "verified":false ("profileUrl":null):
   - Tavily NIE ZNALAZL profilu na tej platformie
   - To NIE OZNACZA ze marka tam nie ma konta - oznacza tylko ze wyszukiwarka nie zwrocila wyniku
   - Mozliwe powody: marka uzywa innej nazwy w URL, profil jest prywatny, slaby SEO platformy, problem z wyszukiwarka
   - NIE wymyslaj URL-ow ani liczb dla tych profili
   - Zostaw pola "nieznane" zgodnie z szablonem

3. ZAKAZANE WNIOSKI:
   - Zakazane jest: "Marka nie jest aktywna na Facebooku/Instagramie/X" tylko dlatego ze nie znaleziono profilu
   - Zakazane jest: obnizanie overallSocialScore z powodu nieznalezionych profili
   - Zakazane jest: wpisywanie w SWOT/weaknesses "brak obecnosci na X" gdy chodzi o nieznaleziony profil
   - JESLI nie znaleziono profilu, w polu summary napisz: "Profile na [platforma X, Y] nie zostaly odnalezione w wyszukiwarce - wymaga recznej weryfikacji."

4. OCENA overallSocialScore:
   - Liczba 0-100, oparta TYLKO na zweryfikowanych profilach
   - Jesli zweryfikowano tylko 1 profil, ocen wylacznie ten profil (nie obnizaj za "brak innych")
   - Jesli 0 zweryfikowanych - wpisz null lub 50 (neutralne)

5. SWOT i recommendations:
   - Buduj WYLACZNIE na podstawie zweryfikowanych profili i danych ogolnych z wyszukiwarki
   - NIE oceniaj nieobecnosci na platformach gdzie profile nie zostaly znalezione

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
