import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { repairAIJSON } from '@/lib/repairJSON'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const maxDuration = 300

interface DNA {
  brandName?: string
  industry?: string
  audience?: string
  values?: string[]
  tone?: string
  usp?: string
}

export async function POST(req: NextRequest) {
  try {
    const limit = await checkGenerationLimit()
    if (!limit.allowed) return new Response(JSON.stringify({ error: limit.reason }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })

    let body: {
      objective: 'lead-gen' | 'ecommerce' | 'awareness' | 'app-installs' | 'traffic'
      platforms: string[]
      budgetTotal: number
      budgetCurrency: string
      duration: number
      targetKPI: string
      productService: string
      targetAudience: string
      geoTargeting: string
      landingPageUrl?: string
      competitors?: string
      existingAssets?: string
      constraints?: string
      dna?: DNA
    }
    try {
      body = await req.json()
    } catch (e) {
      console.error('Performance: malformed request body', e)
      return new Response(JSON.stringify({ error: 'Niepoprawny format zapytania' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Performance: ANTHROPIC_API_KEY missing in env')
      return new Response(JSON.stringify({ error: 'Brak klucza ANTHROPIC_API_KEY na serwerze. Dodaj go w Vercel Environment Variables.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const {
      objective, platforms, budgetTotal, budgetCurrency, duration, targetKPI,
      productService, targetAudience, geoTargeting, landingPageUrl, competitors,
      existingAssets, constraints, dna
    } = body

    if (!productService || !targetAudience || platforms.length === 0) {
      return new Response(JSON.stringify({ error: 'Brak wymaganych pól' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

  const objectiveLabels: Record<string, string> = {
    'lead-gen': 'Lead Generation (formularze, MQL, contacts)',
    'ecommerce': 'E-commerce (sprzedaz, transakcje, ROAS)',
    'awareness': 'Brand Awareness (zasieg, video views, engagement)',
    'app-installs': 'App Installs (instalacje aplikacji, registrations)',
    'traffic': 'Traffic / Quality Visits (kliki, czas na stronie, scroll)',
  }
  const platformLabels: Record<string, string> = {
    meta: 'Meta Ads (Facebook + Instagram)',
    google: 'Google Ads (Search + Display + YouTube)',
    tiktok: 'TikTok Ads',
    linkedin: 'LinkedIn Ads',
  }

  const platformsText = platforms.map(p => platformLabels[p] || p).join(', ')

  const dnaContext = dna?.brandName ? `
KONTEKST MARKI:
- Marka: ${dna.brandName}
${dna.industry ? `- Branza: ${dna.industry}` : ''}
${dna.usp ? `- USP: ${dna.usp}` : ''}
${dna.tone ? `- Ton komunikacji: ${dna.tone}` : ''}
${dna.values?.length ? `- Wartosci: ${dna.values.join(', ')}` : ''}
${dna.audience ? `- Persona: ${dna.audience}` : ''}
` : ''

  const prompt = `Jestes Senior Performance Marketing Strategist z 10-letnim doswiadczeniem w polskich i miedzynarodowych agencjach. Twoja praca to dokladne, konkretne briefy performance z liczbami, podzialem budzetu, audiences i planem optymalizacji.

KONTEKST KAMPANII:
- Cel kampanii: ${objectiveLabels[objective] || objective}
- Platformy reklamowe: ${platformsText}
- Budzet calkowity: ${budgetTotal} ${budgetCurrency}
- Czas trwania: ${duration} tygodni
- Target KPI: ${targetKPI || 'do okreslenia'}
- Produkt/usluga: ${productService}
- Grupa docelowa: ${targetAudience}
- Geo targeting: ${geoTargeting || 'Polska'}
${landingPageUrl ? `- Landing page: ${landingPageUrl}` : ''}
${competitors ? `- Konkurencja: ${competitors}` : ''}
${existingAssets ? `- Istniejace assety: ${existingAssets}` : ''}
${constraints ? `- Ograniczenia: ${constraints}` : ''}
${dnaContext}

ZADANIE: Stworz kompletny brief performance kampanii. Kazda sekcja musi byc KONKRETNA z liczbami, kwotami, %.

Odpowiedz WYLACZNIE poprawnym JSON bez markdown.

KRYTYCZNE - cudzyslowy w wartosciach JSON:
- W tekstach NIE uzywaj prostych cudzyslowow " - to lamie JSON
- Jesli musisz cytowac, uzywaj polskich cudzyslowow drukarskich „..." albo apostrofow '...'

Format JSON (zwroc dokladnie tego):
{
  "executiveSummary": {
    "objective": "Jednolinjkowy cel kampanii",
    "totalBudget": "${budgetTotal} ${budgetCurrency}",
    "duration": "${duration} tygodni",
    "topKPI": "Glowny KPI z targetem (np. CPL <50zl)",
    "expectedResults": "Realistyczne oczekiwania (np. 200-300 leadow miesiecznie, ROAS 3.5-4.5)",
    "summary": "3-4 zdania syntezujace cala strategie"
  },
  "objectives": {
    "primary": {
      "metric": "CPL/CPA/ROAS/CPM/etc",
      "target": "Konkretna wartosc (np. <50 zl)",
      "rationale": "Dlaczego ten target jest realistyczny"
    },
    "secondary": [
      {"metric": "...", "target": "...", "rationale": "..."}
    ],
    "vanityMetrics": ["CTR", "Engagement rate"],
    "northStarMetric": "Jeden najwazniejszy wskaznik dla biznesu klienta"
  },
  "audiences": [
    {
      "platform": "Meta Ads",
      "type": "Core / Lookalike / Retargeting / Interest-based",
      "name": "Nazwa segmentu (np. PL Mlodzi Profesjonalisci 25-40)",
      "demographics": "Demografia (wiek, plec, miasta, dochod)",
      "interests": ["interes 1", "interes 2", "interes 3"],
      "behaviors": ["zachowanie 1", "zachowanie 2"],
      "size": "Szacowany rozmiar (np. 800k-1.2M)",
      "priority": "high|medium|low",
      "budgetShare": "% calkowitego budzetu"
    }
  ],
  "funnel": {
    "tofu": {
      "label": "TOFU (Top of Funnel) - Awareness",
      "objective": "Co chcemy osiagnac",
      "audiences": ["Core 1", "Core 2"],
      "creativeType": "Video 15s / Static carousel / Story",
      "kpi": "CPM, View rate, Reach",
      "budgetShare": "% calkowitego budzetu",
      "duration": "1-2 tydzien"
    },
    "mofu": {
      "label": "MOFU (Middle) - Consideration",
      "objective": "...",
      "audiences": ["Engaged users", "Video viewers 50%+"],
      "creativeType": "Lead gen forms / Catalog / Testimonials",
      "kpi": "CTR, Cost per click, Lead/Cart",
      "budgetShare": "%",
      "duration": "..."
    },
    "bofu": {
      "label": "BOFU (Bottom) - Conversion",
      "objective": "...",
      "audiences": ["Cart abandoners", "Visitors 30 days"],
      "creativeType": "Discount offers / Reviews / Urgency",
      "kpi": "CPL, CPA, ROAS",
      "budgetShare": "%",
      "duration": "..."
    }
  },
  "budgetSplit": {
    "byPlatform": [
      {"platform": "Meta Ads", "amount": "X PLN", "percent": 50, "rationale": "Najwiekszy zasieg dla segmentu"}
    ],
    "byFunnelStage": [
      {"stage": "TOFU", "amount": "X PLN", "percent": 30}
    ],
    "byWeek": [
      {"week": 1, "amount": "X PLN", "focus": "Setup, learning phase, testowanie kreacji"},
      {"week": 2, "amount": "X PLN", "focus": "Pierwsza optymalizacja, zwiekszenie udanych ad setow"}
    ],
    "reserveBudget": "10-15% calkowitego budzetu na testy / nieoczekiwane okazje"
  },
  "creativeStrategy": {
    "totalAdsNeeded": 12,
    "perPlatform": [
      {
        "platform": "Meta Ads",
        "tofu": ["Video hook 15s o problemie", "Carousel 5 frames - showcasing benefits"],
        "mofu": ["Lead form ad", "Testimonial video 30s"],
        "bofu": ["Discount banner", "Urgency CTA"]
      }
    ],
    "creativePillars": ["Pillar 1: pain point", "Pillar 2: social proof", "Pillar 3: urgency"],
    "abTestPlan": [
      {
        "testName": "Hook Test - Question vs Statement",
        "hypothesis": "Hook w formie pytania zwiekszy CTR o 20%+",
        "duration": "7 dni",
        "successCriteria": "Statistical significance 95%, +15% CTR",
        "winnerScaleStrategy": "Skopiuj zwyciesce do innych ad setow, zwieksz budzet 50%"
      }
    ]
  },
  "landingPageRequirements": {
    "criticalElements": [
      "H1 z USP w pierwszych 3 sekundach",
      "Social proof above the fold (logosy, testimoniale)",
      "Form/CTA powyzej zalamania (no scroll)",
      "Mobile-first, ladowanie <3s",
      "Trust badges (RODO, sertyfikaty)"
    ],
    "conversionRateTarget": "Realistyczna konwersja LP (np. 3-5% dla lead gen)",
    "trackingChecklist": ["Meta Pixel", "Conversion API", "GA4 + GTM", "UTM standards"],
    "redFlags": ["Co MOZE zabic konwersje (np. video autoplay z dzwiekiem)"]
  },
  "tracking": {
    "pixels": ["Meta Pixel base + events", "Google Tag", "LinkedIn Insight Tag"],
    "events": [
      {"name": "PageView", "trigger": "kazda strona"},
      {"name": "Lead", "trigger": "submit formularza"},
      {"name": "Purchase", "trigger": "thank you page"}
    ],
    "utmConvention": "utm_source=meta&utm_medium=cpc&utm_campaign={campaign_id}&utm_content={ad_name}",
    "attribution": "7-day click + 1-day view (Meta default), 30-day click (Google)",
    "serverSide": "Conversion API setup wymagany dla iOS 14+",
    "reporting": "Looker Studio dashboard z auto-refresh codzienny"
  },
  "optimizationPlan": {
    "week1": {
      "focus": "Learning phase, kazdy ad set ma min 50 konwersji aby wyjsc z learning",
      "actions": ["Setup, dobor audiences", "Upload kreacji", "Tracking sanity check", "Budzety per ad set"],
      "redFlags": ["CPM > 2x sredni rynkowy = zly target", "Frequency >2 w tydzien 1 = zbyt waska audience"]
    },
    "week2": {
      "focus": "Pierwsza optymalizacja na podstawie danych",
      "actions": ["Pause underperformerow (CPL >150% target)", "Skaluj winners +30% budzet", "Nowe kreacje dla zwyciezcow"],
      "redFlags": ["Frequency >5 = zmecznie audience, dolacz nowych", "CPL nadal odbiega o 50%+ - rewizja oferty"]
    },
    "week3to4": {
      "focus": "Skalowanie i creative refresh",
      "actions": ["Lookalike z konwersji", "A/B test landing page", "Wprowadzenie BOFU retargeting", "Creative refresh - nowe hookey"],
      "redFlags": ["CPA stale rosnie - audience saturation", "Statystyki konwersji LP <2% - problem na stronie"]
    },
    "ongoing": {
      "weekly": ["Performance review co poniedzialek", "Budzet rebalance srednia, 4-12 ad sets na platforme"],
      "monthly": ["Creative refresh ~30%", "Nowe audiences eksperymenty", "Atrybucja review"]
    }
  },
  "reporting": {
    "frequency": "Tygodniowo (poniedzialek) + miesieczny przeglad",
    "stakeholders": ["Klient - executive summary", "Specialist - drill down per ad set"],
    "kpisToTrack": [
      "Spend vs Budget (na biezaco)",
      "CPL/CPA/ROAS vs target",
      "Wolumen leads/sales",
      "Best vs Worst kreacje (creative fatigue)",
      "Funnel drop-off (CPM->CTR->CPC->CR)"
    ],
    "dashboardTools": "Looker Studio (free), Triple Whale (e-com), Northbeam (advanced)",
    "alertsToSet": ["CPA > 130% target przez 3 dni", "Spend variance >20% vs plan", "Frequency >7"]
  },
  "risks": [
    {
      "risk": "iOS 14.5+ tracking loss (Meta podaje attribution mniej dokladne)",
      "impact": "high",
      "mitigation": "Setup Conversion API + Server Side GTM + 1st party data"
    },
    {
      "risk": "...",
      "impact": "medium",
      "mitigation": "..."
    }
  ],
  "successCriteria": {
    "minimumViableSuccess": "Co MUSI sie zdarzyc zeby kampania byla 'OK' (np. CPL <80% target)",
    "targetSuccess": "Realistyczny cel (np. CPL = target, volume = 80% of plan)",
    "stretchGoal": "Best case scenario (np. CPL <50% target, volume = 120%)"
  }
}

KRYTYCZNE WYTYCZNE:
- Liczby musza byc REALNE dla polskiego rynku 2026 (nie zawyzaj/zanizaj)
- Kazda sekcja KONKRETNA - nie pisz ogolników w stylu "zoptymalizuj kampanie"
- Budget split MUSI sumowac sie do 100%
- Audiences specyficzne (np. "Mama 28-42, dziecko 0-3 lata, miasto >100k, srednie+ dochody") nie generyczne
- Optimization plan dzien po dniu w pierwszym tygodniu
- W riskach min 3 konkretne zagrozenia z mitigation`

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (data: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      let fullText = ''
      let sentDone = false

      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 16000,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
        })

        for await (const chunk of response) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const text = chunk.delta.text
            fullText += text
            send({ chunk: text })
          }
        }

        console.log('Performance brief finished, length:', fullText.length)
        const { parsed, strategy } = repairAIJSON(fullText)

        if (parsed) {
          console.log('Performance parsed OK via:', strategy)
          send({ done: true, data: parsed })
        } else {
          console.error('Performance parse failed. Last 500:', fullText.slice(-500))
          send({ error: 'Nie mozna przetworzyc JSON', debug: { len: fullText.length } })
        }
        sentDone = true
      } catch (e) {
        console.error('Performance stream error:', e)
        if (!sentDone) {
          send({ error: e instanceof Error ? e.message : 'Blad generowania' })
        }
      } finally {
        controller.close()
      }
    }
  })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    // Catch ANY runtime exception that wasn't handled above
    const errMsg = err instanceof Error ? err.message : String(err)
    const errStack = err instanceof Error ? err.stack : ''
    console.error('Performance route fatal error:', errMsg)
    console.error('Stack:', errStack)
    return new Response(JSON.stringify({
      error: `Performance route crashed: ${errMsg}`,
      stack: errStack?.split('\n').slice(0, 5).join('\n'),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
