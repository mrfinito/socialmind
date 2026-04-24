import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function robustParse(raw: string) {
  let clean = raw.replace(/```json\n?|```\n?/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
  if (s !== -1 && e !== -1) {
    clean = clean.slice(s, e + 1)
    try { return JSON.parse(clean) } catch {}
    clean = clean.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/,(\s*[}\]])/g, '$1')
    try { return JSON.parse(clean) } catch {}
  }
  throw new Error('Nie mozna przetworzyc odpowiedzi AI')
}

export async function POST(req: NextRequest) {
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.reason, limit_exceeded: true }, { status: 429 })
  }

  try {
    const { dna, competitors, targetAudience, goals, budget, duration, platforms } = await req.json()

    const prompt = `Jestes doswiadczonym strategiem komunikacji z wieloletnim doswiadczeniem w budowaniu strategii social media dla polskich i miedzynarodowych marek.

DANE DO STRATEGII:
Marka: ${dna?.brandName || 'Marka'}
Branza: ${dna?.industry || 'ogolna'}
USP: ${dna?.usp || 'brak'}
Ton komunikacji: ${dna?.tone || 'profesjonalny'}
Persona klienta: ${dna?.persona || 'brak'}
Wartosci marki: ${dna?.values || 'brak'}
Slowa kluczowe: ${dna?.keywords || 'brak'}

KONTEKST RYNKOWY:
Glowni konkurenci: ${competitors || 'nie podano'}
Grupa docelowa: ${targetAudience || dna?.persona || 'nie podano'}
Cele biznesowe: ${(goals || []).join(', ') || 'swiadomosc marki'}
Dostepny budzet: ${budget || 'sredni'}
Horyzont strategii: ${duration || '3 miesiace'}
Platformy do obslugi: ${(platforms || ['facebook','instagram']).join(', ')}

TWOJE ZADANIE:
Stworz kompleksowa, gotowa do wdrozenia strategie komunikacji w social mediach. Strategia musi byc:
- Konkretna i operacyjna (nie ogolna)
- Dostosowana do polskiego rynku
- Realizowalna przy podanym budzecie
- Mierzalna (konkretne KPI)

Odpowiedz TYLKO czystym JSON:

{
  "executiveSummary": "Strategiczne podsumowanie dla zarzadu — 3-4 zdania opisujace glowne zalozenia i oczekiwane rezultaty",
  "brandPosition": {
    "currentState": "obiektywna ocena obecnej pozycji marki w social mediach i swiadomosci klientow",
    "desiredState": "konkretny, mierzalny cel na koniec okresu ${duration || '3 miesiace'}",
    "gap": "glowne wyzwania i dzialania potrzebne do osiagniecia celu",
    "uniqueVoice": "unikalny glos i styl komunikacji — jak marka powinna brzmiec, co ja wyróznia komunikacyjnie"
  },
  "audienceInsight": {
    "primarySegment": "precyzyjny opis glownego segmentu odbiorcy — demografia, psychografia, zachowania",
    "painPoints": ["konkretny bol lub problem grupy docelowej 1", "bol 2", "bol 3"],
    "motivations": ["glowna motywacja do zakupu/kontaktu 1", "motywacja 2", "motywacja 3"],
    "contentConsumption": "kiedy, gdzie i jak ta grupa konsumuje content w social mediach",
    "decisionFactors": ["czynnik decyzji zakupowej 1", "czynnik 2", "czynnik 3"]
  },
  "competitiveAnalysis": {
    "marketGaps": ["konkretna luka rynkowa 1 ktora marka moze wypelnic", "luka 2", "luka 3"],
    "differentiators": ["konkretny wyroznik vs konkurencja 1", "wyroznik 2", "wyroznik 3"],
    "competitorWeaknesses": "co konkurencja robi zle lub czego nie robi — konkretna obserwacja"
  },
  "contentStrategy": {
    "pillars": [
      {
        "name": "Nazwa filaru 1",
        "description": "szczegolowy opis o co chodzi w tym filarze i dlaczego jest wazny dla tej marki",
        "percentage": 30,
        "examples": ["konkretny przyklad posta lub serii", "przyklad 2", "przyklad 3"]
      },
      {
        "name": "Nazwa filaru 2",
        "description": "opis filaru 2",
        "percentage": 25,
        "examples": ["przyklad 1", "przyklad 2"]
      },
      {
        "name": "Nazwa filaru 3",
        "description": "opis filaru 3",
        "percentage": 25,
        "examples": ["przyklad 1", "przyklad 2"]
      },
      {
        "name": "Nazwa filaru 4",
        "description": "opis filaru 4",
        "percentage": 20,
        "examples": ["przyklad 1", "przyklad 2"]
      }
    ],
    "toneGuidelines": [
      "konkretna zasada tonu i stylu komunikacji 1",
      "zasada 2 — np. jak pisac o cenach",
      "zasada 3 — np. jak reagowac na komentarze",
      "zasada 4 — np. jak pisac CTA"
    ],
    "doList": [
      "konkretna rzecz ktora marka powinna robic w social mediach 1",
      "rzecz 2",
      "rzecz 3",
      "rzecz 4"
    ],
    "dontList": [
      "czego absolutnie nie robic 1 z wyjasnieniem",
      "czego nie robic 2",
      "czego nie robic 3"
    ]
  },
  "platformStrategy": [
    {
      "platform": "nazwa platformy",
      "role": "rola tej platformy w calej strategii — co ma tu osiagac marka",
      "frequency": "X postow tygodniowo + stories/reels etc",
      "bestFormats": ["najlepszy format 1 dla tej platformy i branzy", "format 2", "format 3"],
      "bestTimes": "najlepsze godziny i dni publikacji dla tej grupy docelowej",
      "kpi": "glowny KPI do sledzenia na tej platformie",
      "contentMix": "proporcje typow tresci np. 40% edu, 30% zaangazowanie, 30% promo"
    }
  ],
  "contentCalendar": {
    "weeklyRhythm": "szczegolowy rytm tygodniowy — co kiedy publikowac i dlaczego wlasnie wtedy",
    "monthlyThemes": [
      "temat przewodni miesiaca 1 z uzasadnieniem",
      "temat miesiaca 2",
      "temat miesiaca 3"
    ],
    "keyDates": [
      "wazna data lub wydarzenie dla tej branzy 1",
      "data 2",
      "data 3"
    ],
    "campaignIdeas": [
      {
        "name": "Nazwa kampanii 1",
        "concept": "szczegolowy opis konceptu kampanii — o co chodzi, jaki mechanizm, jaki cel",
        "timing": "kiedy realizowac i przez ile czasu"
      },
      {
        "name": "Nazwa kampanii 2",
        "concept": "opis kampanii 2",
        "timing": "kiedy"
      },
      {
        "name": "Nazwa kampanii 3",
        "concept": "opis kampanii 3",
        "timing": "kiedy"
      }
    ]
  },
  "kpis": [
    {
      "metric": "Zasieg organiczny",
      "target": "konkretna liczba np. 10000/mies",
      "timeline": "${duration || '3 miesiace'}",
      "howToMeasure": "gdzie i jak mierzyc ten KPI"
    },
    {
      "metric": "Wskaznik zaangazowania",
      "target": "np. 3-5% srednia",
      "timeline": "${duration || '3 miesiace'}",
      "howToMeasure": "jak mierzyc"
    },
    {
      "metric": "Wzrost obserwujacych",
      "target": "np. +500/mies",
      "timeline": "${duration || '3 miesiace'}",
      "howToMeasure": "jak mierzyc"
    },
    {
      "metric": "Konwersje z social media",
      "target": "np. 50 leadow/mies",
      "timeline": "${duration || '3 miesiace'}",
      "howToMeasure": "UTM links, Meta Pixel"
    }
  ],
  "actionPlan": [
    {
      "week": "Tydzien 1-2 — Fundament",
      "actions": [
        "konkretna akcja do wykonania 1",
        "akcja 2",
        "akcja 3",
        "akcja 4"
      ]
    },
    {
      "week": "Tydzien 3-4 — Launch",
      "actions": ["akcja 1", "akcja 2", "akcja 3"]
    },
    {
      "week": "Miesiac 2 — Skalowanie",
      "actions": ["akcja 1", "akcja 2", "akcja 3"]
    },
    {
      "week": "Miesiac 3 — Optymalizacja",
      "actions": ["akcja 1", "akcja 2", "akcja 3"]
    }
  ],
  "budget": {
    "organic": "szczegolowy plan dzialan organicznych — co robic bez budzetu reklamowego",
    "paid": "rekomendacja podzialu budzetu ${budget || 'dostepnego'} na reklamy — jakie kampanie, jakie formaty, jakie cele",
    "tools": ["narzedzie 1 z opisem do czego", "narzedzie 2", "narzedzie 3", "narzedzie 4"]
  },
  "hashtags": {
    "brand": ["#brandowy1", "#brandowy2"],
    "industry": ["#branzowy1", "#branzowy2", "#branzowy3", "#branzowy4"],
    "campaign": "#unikalnyHashtagKampanijny"
  }
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content.map((b: {type:string;text?:string}) => b.type==='text'?b.text:'').join('')
    const parsed = robustParse(raw)
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad generowania strategii' }, { status: 500 })
  }
}
