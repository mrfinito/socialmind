import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return new Response(JSON.stringify({ error: limitCheck.reason }), {
      status: 429, headers: { 'Content-Type': 'application/json' }
    })
  }

  const { dna, competitors, targetAudience, goals, budget, duration, platforms } = await req.json()
  const brand = String(dna?.brandName || 'Marka')
  const ind = String(dna?.industry || 'ogolna')
  const tone = String(dna?.tone || 'profesjonalny')
  const usp = String(dna?.usp || 'brak')
  const persona = String(dna?.persona || targetAudience || 'brak')
  const values = String(dna?.values || 'brak')
  const keywords = String(dna?.keywords || 'brak')
  const plt = Array.isArray(platforms) ? platforms.join(', ') : 'facebook, instagram'
  const dur = String(duration || '3 miesiace')
  const goalsStr = Array.isArray(goals) ? goals.join(', ') : 'swiadomosc marki'
  const comp = String(competitors || 'nie podano')
  const bud = String(budget || 'nie podano')

  const systemPrompt = `Jestes senior strategiem komunikacji z 15-letnim doswiadczeniem w polskim rynku reklamowym. Pracowales dla najwiekszych polskich agencji i marek. Masz glebokie zrozumienie:
- polskiego konsumenta i jego zachowan w social media
- specyfiki algorytmow Facebook, Instagram, LinkedIn, TikTok dla polskiego rynku
- benchmarkow branzowych i realnych KPI osiagalnych na polskim rynku
- kulturowych niuansow komunikacji w Polsce

Tworzysz strategie operacyjne - konkretne, wykonalne, oparte na danych. Nie lejesz wody. Kazda rekomendacja musi byc poparta rzeczowym uzasadnieniem. Strategia ma byc gotowa do wdrozenia jutro, nie akademickim opracowaniem.

Odpowiadasz WYLACZNIE poprawnym JSON bez zadnego tekstu przed ani po. Nie uzywaj markdown ani backtickow.`

  const prompt = `STWORZ KOMPLEKSOWA STRATEGIE KOMUNIKACJI SOCIAL MEDIA

DANE MARKI:
- Nazwa: ${brand}
- Branza: ${ind}
- Unikalna propozycja wartosci (USP): ${usp}
- Ton komunikacji: ${tone}
- Wartosci marki: ${values}
- Slowa kluczowe: ${keywords}

GRUPA DOCELOWA:
${persona}

KONTEKST RYNKOWY:
- Glowni konkurenci: ${comp}
- Cele biznesowe: ${goalsStr}
- Dostepny budzet miesieczny: ${bud}
- Horyzont strategii: ${dur}
- Platformy do obslugi: ${plt}

TWOJE ZADANIE:
Stworz strategie ktora:
1. Jest OPERACYJNA - konkretne akcje, nie ogólniki
2. Jest DOSTOSOWANA do polskiego rynku i specyfiki branzy ${ind}
3. Jest REALIZOWALNA przy podanym budzecie
4. Jest MIERZALNA - konkretne KPI z realnymi targetami
5. Pokazuje ROZNICE vs konkurencja - jak marka ${brand} ma sie wyroznic
6. Uwzglednia POLSKIE NIUANSE kulturowe i komunikacyjne

ZWROC JSON O STRUKTURZE:
{
  "executiveSummary": "3-4 zdania streszczajace strategie - co marka osiagnie, jak i w jakim czasie. Ma byc gotowe do prezentacji zarzadowi.",
  "brandPosition": {
    "currentState": "Obiektywna, szczera ocena obecnej pozycji marki w social mediach - co juz jest dobre, gdzie sa slabosci",
    "desiredState": "Konkretny, mierzalny cel na koniec ${dur} - nie 'zwiekszyc swiadomosc' tylko np. 'top 3 marki w kategorii wg Brand24, 50k zasiegu miesiecznie, 5% engagement rate'",
    "gap": "Konkretne dzialania potrzebne do przejscia z A do B - kluczowe inwestycje, zmiany, decyzje",
    "uniqueVoice": "Unikalny glos i styl komunikacji marki - jak ${brand} ma brzmiec inaczej niz konkurencja, jakie slowa uzywac, a jakich unikac"
  },
  "audienceInsight": {
    "primarySegment": "Szczegolowy opis glownego segmentu: demografia, psychografia, zachowania zakupowe, aspiracje, lek, jezyk ktorego uzywaja",
    "painPoints": ["Konkretny bol lub problem 1 z wyjasnieniem", "bol 2", "bol 3"],
    "motivations": ["Glowna motywacja do zakupu 1", "motywacja 2", "motywacja 3"],
    "contentConsumption": "Kiedy, gdzie i jak ta grupa konsumuje content social media - konkretne dni, godziny, formaty",
    "decisionFactors": ["Czynnik decyzji 1", "czynnik 2", "czynnik 3"]
  },
  "competitiveAnalysis": {
    "marketGaps": ["Konkretna luka rynkowa 1 ktora ${brand} moze wypelnic", "luka 2", "luka 3"],
    "differentiators": ["Konkretny wyroznik 1 vs konkurencja", "wyroznik 2", "wyroznik 3"],
    "competitorWeaknesses": "Szczegolowa obserwacja: co konkurencja robi zle, czego nie robi, gdzie ma slabe strony komunikacyjne"
  },
  "contentStrategy": {
    "pillars": [
      {
        "name": "Nazwa filaru 1 (konkretna)",
        "description": "Szczegolowy opis: o co chodzi w tym filarze, jakie tematy obejmuje, dlaczego jest wazny dla ${brand} i grupy docelowej",
        "percentage": 30,
        "examples": ["Konkretny przyklad posta lub serii 1", "przyklad 2", "przyklad 3"]
      },
      {
        "name": "Filar 2",
        "description": "Opis szczegolowy",
        "percentage": 25,
        "examples": ["przyklad 1", "przyklad 2"]
      },
      {
        "name": "Filar 3",
        "description": "Opis szczegolowy",
        "percentage": 25,
        "examples": ["przyklad 1", "przyklad 2"]
      },
      {
        "name": "Filar 4",
        "description": "Opis szczegolowy",
        "percentage": 20,
        "examples": ["przyklad 1", "przyklad 2"]
      }
    ],
    "toneGuidelines": [
      "Konkretna zasada tonu 1 - np. zwracamy sie per Ty, uzywamy prostych slow",
      "zasada 2 - np. jak pisac o cenach",
      "zasada 3 - jak reagowac na komentarze",
      "zasada 4 - jak pisac CTA",
      "zasada 5 - czego unikac w jezyku"
    ],
    "doList": [
      "Konkretna rzecz do robienia 1 z uzasadnieniem",
      "rzecz 2", "rzecz 3", "rzecz 4", "rzecz 5"
    ],
    "dontList": [
      "Czego absolutnie nie robic 1 z wyjasnieniem dlaczego",
      "nie robic 2", "nie robic 3"
    ]
  },
  "platformStrategy": [
    {
      "platform": "nazwa platformy (facebook/instagram/linkedin itp)",
      "role": "Rola tej platformy w calej strategii - co ma tu osiagac marka",
      "frequency": "Konkretna czestotliwosc: X postow tygodniowo + Y stories + Z reels",
      "bestFormats": ["Najlepszy format 1 dla tej platformy i branzy", "format 2", "format 3"],
      "bestTimes": "Konkretne najlepsze godziny i dni publikacji dla tej grupy docelowej w PL",
      "kpi": "Glowny KPI do sledzenia na tej platformie z targetem",
      "contentMix": "Proporcje typow tresci: np. 40% edukacja, 30% zaangazowanie, 20% produkt, 10% za kulisami"
    }
  ],
  "contentCalendar": {
    "weeklyRhythm": "Szczegolowy rytm tygodniowy - co kiedy publikowac i dlaczego wlasnie wtedy, z uwzglednieniem aktywnosci grupy docelowej",
    "monthlyThemes": [
      "Temat przewodni miesiaca 1 z uzasadnieniem dlaczego ten temat na ten miesiac",
      "temat miesiaca 2 z uzasadnieniem",
      "temat miesiaca 3 z uzasadnieniem"
    ],
    "keyDates": [
      "Wazna data lub wydarzenie 1 dla branzy ${ind} w tym okresie",
      "data 2", "data 3", "data 4"
    ],
    "campaignIdeas": [
      {
        "name": "Konkretna nazwa kampanii 1",
        "concept": "Szczegolowy opis konceptu: o co chodzi, jaki mechanizm, jakie aktywacje, jaki rezultat",
        "timing": "Kiedy realizowac i przez ile czasu"
      },
      {
        "name": "Kampania 2",
        "concept": "Szczegolowy opis",
        "timing": "Kiedy"
      },
      {
        "name": "Kampania 3",
        "concept": "Szczegolowy opis",
        "timing": "Kiedy"
      }
    ]
  },
  "kpis": [
    {
      "metric": "Zasieg organiczny",
      "target": "Konkretna liczba realna dla branzy np. 10000/mies",
      "timeline": "${dur}",
      "howToMeasure": "Konkretne narzedzie i sposob pomiaru"
    },
    {
      "metric": "Wskaznik zaangazowania (engagement rate)",
      "target": "Konkretny procent z benchmarkiem branzowym",
      "timeline": "${dur}",
      "howToMeasure": "Formula i narzedzie"
    },
    {
      "metric": "Wzrost obserwujacych",
      "target": "Konkretna liczba/miesiac",
      "timeline": "${dur}",
      "howToMeasure": "Narzedzie"
    },
    {
      "metric": "Konwersje biznesowe (leady/sprzedaz)",
      "target": "Konkretna liczba",
      "timeline": "${dur}",
      "howToMeasure": "UTM + Meta Pixel + CRM"
    }
  ],
  "actionPlan": [
    {
      "week": "Tydzien 1-2 - Fundament",
      "actions": [
        "Konkretna akcja operacyjna 1 do wykonania",
        "akcja 2", "akcja 3", "akcja 4", "akcja 5"
      ]
    },
    {
      "week": "Tydzien 3-4 - Launch",
      "actions": ["akcja 1", "akcja 2", "akcja 3", "akcja 4"]
    },
    {
      "week": "Miesiac 2 - Skalowanie",
      "actions": ["akcja 1", "akcja 2", "akcja 3", "akcja 4"]
    },
    {
      "week": "Miesiac 3 - Optymalizacja i ekspansja",
      "actions": ["akcja 1", "akcja 2", "akcja 3", "akcja 4"]
    }
  ],
  "budget": {
    "organic": "Szczegolowy plan dzialan organicznych - co robic bez budzetu reklamowego, jakie zasoby sa potrzebne",
    "paid": "Rekomendacja podzialu budzetu reklamowego ${bud} - jakie kampanie, jakie formaty, jakie cele reklamowe, jakie grupy docelowe do targetowania",
    "tools": [
      "Narzedzie 1 - do czego konkretnie i dlaczego",
      "narzedzie 2 - do czego",
      "narzedzie 3 - do czego",
      "narzedzie 4 - do czego"
    ]
  },
  "hashtags": {
    "brand": ["#HashtagMarki1", "#HashtagMarki2"],
    "industry": ["#BranzowyPopularnyWPL1", "#BranzowyPopularnyWPL2", "#BranzowyPopularnyWPL3", "#BranzowyPopularnyWPL4"],
    "campaign": "#UnikalnyHashtagKampanii"
  }
}`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {}
      }

      let fullText = ''
      let sentDone = false

      try {
        const anthropicStream = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 8000,
          stream: true,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        })

        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullText += event.delta.text
            send({ chunk: event.delta.text })
          }
        }

        console.log('Strategia finished, length:', fullText.length)
        const start = fullText.indexOf('{')
        const end = fullText.lastIndexOf('}')

        if (start === -1 || end === -1) {
          send({ error: 'Brak JSON w odpowiedzi AI' })
          sentDone = true
        } else {
          let clean = fullText.slice(start, end + 1)
          let parsed = null

          try { parsed = JSON.parse(clean) } catch {}
          if (!parsed) {
            clean = clean.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, (m) =>
              m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
            )
            try { parsed = JSON.parse(clean) } catch {}
          }
          if (!parsed) {
            clean = clean.replace(/,(\s*[}\]])/g, '$1')
            try { parsed = JSON.parse(clean) } catch {}
          }

          if (parsed) {
            console.log('Strategia parsed OK')
            send({ done: true, data: parsed })
          } else {
            console.error('Strategia parse failed')
            send({ error: 'Nie mozna przetworzyc JSON' })
          }
          sentDone = true
        }
      } catch (err) {
        console.error('Strategia error:', err)
        send({ error: err instanceof Error ? err.message : 'Blad' })
        sentDone = true
      }

      if (!sentDone) send({ error: 'Stream bez wyniku' })
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    }
  })
}
