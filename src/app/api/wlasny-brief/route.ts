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

  const { briefText, projectName, additionalContext } = await req.json() as {
    briefText: string
    projectName?: string
    additionalContext?: string
  }

  if (!briefText || briefText.trim().length < 50) {
    return new Response(JSON.stringify({ error: 'Brief jest zbyt krotki - minimum 50 znakow' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const systemPrompt = `Jestes senior creative director i strategiem w agencji reklamowej z 20-letnim doswiadczeniem na polskim rynku. Pracowales przy najwiekszych kampaniach - od koncepcji strategicznej, przez ATL, BTL, digital, az po social media i niestandardowe aktywacje.

Twoja praca to:
1. Glebokie zrozumienie briefu klienta - co naprawde chce osiagnac, czego sie boi, co go inspiruje
2. Stworzenie strategii komunikacji ktora odpowiada na realny problem biznesowy
3. Wygenerowanie BIG IDEA - jednego, mocnego konceptu kreatywnego
4. Rozpisanie tego pomyslu na wszystkie kanaly: ATL, digital, social, niestandardowe
5. Kazdy element musi byc wykonalny, mierzalny i zgodny z briefem

ZASADY:
- Big idea musi byc jedna, klara, zapamietywalna
- Kampania ma sluzyc realizacji celu z briefu, nie byc sztuka dla sztuki
- Wszystkie elementy musza ze soba spojnie pracowac (one campaign feel)
- Bierz pod uwage polski kontekst kulturowy i specyfike rynku
- Bez wody, bez ogolnikow - konkretne wykonalne pomysly

Odpowiadasz WYLACZNIE poprawnym JSON bez zadnego tekstu przed ani po. Nie uzywaj markdown ani backtickow.`

  const prompt = `BRIEF KAMPANII DO OPRACOWANIA${projectName ? ` (${projectName})` : ''}

TRESC BRIEFU OD KLIENTA:
"""
${briefText.slice(0, 8000)}
"""

${additionalContext ? `DODATKOWY KONTEKST:\n${additionalContext.slice(0, 1000)}\n\n` : ''}

ZADANIE:
Na podstawie tego briefu stworz kompleksowe opracowanie kampanii reklamowej. Mysl jak senior creative director - jakim jednym, mocnym konceptem mozna odpowiedziec na potrzeby klienta?

ZWROC JSON O STRUKTURZE:
{
  "briefAnalysis": {
    "businessProblem": "Co jest realnym problemem biznesowym ktory ma rozwiazac kampania - 2-3 zdania",
    "targetAudience": "Szczegolowy opis grupy docelowej - kim sa, co czuja, co ich motywuje, jakie maja insights",
    "objectives": ["Konkretny cel kampanii 1", "cel 2", "cel 3"],
    "constraints": "Ograniczenia z briefu - budzet, czas, kanaly, czego unikac",
    "successCriteria": "Jak bedziemy mierzyc sukces - konkretne KPI"
  },
  
  "communicationStrategy": {
    "insight": "Glowny insight strategiczny - prawda o grupie docelowej ktora pcha cala kampanie. To nie jest opis grupy, ale CEL ktory ich napedza, ich frustracja, ich nadzieja.",
    "positioning": "Pozycjonowanie marki w kampanii - jaka role gra w zyciu odbiorcy",
    "promise": "Glowna obietnica do odbiorcy - co dostanie, jak sie zmieni jego zycie",
    "rtb": ["Reason to believe 1 - dlaczego mamy w to wierzyc", "rtb 2", "rtb 3"],
    "messageHierarchy": {
      "primary": "Glowna wiadomosc kampanii - jedno zdanie",
      "secondary": ["Wiadomosc wspierajaca 1", "wsparcie 2", "wsparcie 3"]
    },
    "toneOfVoice": "Jak marka ma brzmiec w tej kampanii - 2-3 zdania z konkretami"
  },
  
  "bigIdea": {
    "name": "Nazwa konceptu kreatywnego - krotka, chwytliwa",
    "tagline": "Tagline kampanii - 3-7 slow ktore zostana w glowie",
    "concept": "Pelne wyjasnienie konceptu - 4-5 zdan. Co to za pomysl, dlaczego dziala, jak laczy sie z briefem",
    "executionalIdea": "Jak ten koncept przeklada sie na egzekucje - 3-4 zdania",
    "whyItWorks": ["Powod dzialania 1 - psychologiczny/strategiczny", "powod 2", "powod 3"],
    "campaignNarrative": "Storytelling kampanii - co opowiadamy odbiorcy w czasie trwania kampanii"
  },
  
  "atl": {
    "tvSpot": {
      "title": "Tytul spotu",
      "duration": "30s lub 60s",
      "synopsis": "Co dzieje sie w spocie - 4-5 zdan opisujacych narracje",
      "keyScenes": ["Scena 1 (0-5s) - opis", "Scena 2 (5-15s) - opis", "Scena 3 (15-25s) - opis", "Scena 4 (25-30s) - finale i logo"],
      "voiceover": "Pelny tekst voiceovera",
      "endline": "Ending z logo i tagline"
    },
    "radioSpot": {
      "title": "Tytul spotu radiowego",
      "duration": "30s",
      "script": "Pelny script spotu radiowego - z dialogami, opisem dzwiekow w nawiasach"
    },
    "ooh": {
      "concept": "Glowny koncept billboardow - co pokazujemy",
      "headlines": ["Headline 1 dla billboardu", "headline 2", "headline 3"],
      "visualDescription": "Opis wizualny billboardow - kolorystyka, kompozycja, mood",
      "placements": "Sugerowane lokalizacje i formaty (city light, billboard 6x3, mega format itp)"
    }
  },
  
  "digital": {
    "campaignSite": {
      "concept": "Koncept landing page - co tam jest, jaki cel",
      "structure": ["Sekcja 1 (hero) - opis", "Sekcja 2 - opis", "Sekcja 3 - opis", "Sekcja 4 - CTA"],
      "interactiveElements": ["Element interaktywny 1 (np. quiz, kalkulator, AR filter)", "element 2", "element 3"]
    },
    "displayAds": {
      "concept": "Koncept reklam displayowych",
      "formats": ["Format 1 - 300x250 - opis", "Format 2 - 728x90 - opis", "Format 3 - 970x250 - opis"],
      "cta": "Wezwanie do dzialania"
    },
    "videoAds": [
      {
        "platform": "YouTube",
        "format": "TrueView in-stream 6s",
        "concept": "Co pokazujemy w 6 sekund",
        "script": "Skrocony script"
      },
      {
        "platform": "YouTube",
        "format": "Bumper 6s skippable",
        "concept": "Wersja skipowalna",
        "script": "Skrocony script"
      }
    ],
    "influencerStrategy": {
      "approach": "Strategia influencerska - jacy influencerzy, jaka wspolpraca, jaki tone",
      "tiers": ["Mega influencerzy (1-2 osoby) - rola w kampanii", "Macro (3-5 osob) - rola", "Micro (10-15 osob) - rola"],
      "contentTypes": ["Typ contentu 1 - opis", "typ 2 - opis", "typ 3 - opis"]
    }
  },
  
  "social": {
    "strategicApproach": "Glowne podejscie do social media w tej kampanii - 2-3 zdania",
    "facebook": {
      "approach": "Co robimy na FB",
      "contentTypes": ["Typ contentu 1", "typ 2", "typ 3"],
      "samplePosts": [
        {"type": "Post launchowy", "text": "Pelny tekst posta", "visualIdea": "Opis grafiki"},
        {"type": "Post zaangazowany", "text": "Pelny tekst", "visualIdea": "Opis grafiki"}
      ]
    },
    "instagram": {
      "approach": "Co robimy na IG",
      "contentTypes": ["Posty", "Reels", "Stories", "Carousels"],
      "samplePosts": [
        {"type": "Reel hero", "concept": "Koncept reela", "caption": "Caption", "visualIdea": "Opis wizualny"},
        {"type": "Carousel", "concept": "Koncept", "caption": "Caption", "visualIdea": "Opis"}
      ]
    },
    "tiktok": {
      "approach": "Co robimy na TT",
      "contentIdeas": ["Pomysl 1 - opis konkretnego TikToka", "pomysl 2 - opis", "pomysl 3 - opis"],
      "challenges": "Pomysl na challenge lub trend ktory mozemy stworzyc/wykorzystac"
    },
    "linkedin": {
      "approach": "Co robimy na LinkedIn (jesli relewantne)",
      "contentTypes": ["Typ 1", "typ 2"]
    }
  },
  
  "activations": {
    "experiential": [
      {
        "name": "Nazwa aktywacji 1",
        "description": "Szczegolowy opis - co sie dzieje, gdzie, kiedy, jak",
        "objective": "Co osiagniemy",
        "scale": "Skala (lokalna/krajowa, ile osob, ile lokalizacji)"
      },
      {
        "name": "Aktywacja 2",
        "description": "Opis",
        "objective": "Cel",
        "scale": "Skala"
      }
    ],
    "guerrilla": [
      {
        "name": "Akcja guerilla 1",
        "description": "Co robimy - powinno byc niestandardowe, viralowe, niskobudzetowe",
        "rationale": "Dlaczego ma to sens"
      }
    ],
    "partnerships": [
      {
        "partner": "Typ partnera lub konkretna marka/instytucja",
        "concept": "Co wspolnie robimy",
        "value": "Co kazdy zyskuje"
      }
    ],
    "pr": {
      "angles": ["Angle PR 1 dla mediow", "angle 2", "angle 3"],
      "events": "Pomysly na eventy prasowe lub momenty PR-owe"
    }
  },
  
  "execution": {
    "phases": [
      {"phase": "Tease (Tydzien 1-2)", "objectives": "Co robimy", "channels": ["kanal 1", "kanal 2"], "kpi": "Co mierzymy"},
      {"phase": "Launch (Tydzien 3-4)", "objectives": "Co robimy", "channels": ["kanal 1", "kanal 2", "kanal 3"], "kpi": "Co mierzymy"},
      {"phase": "Sustain (Tydzien 5-8)", "objectives": "Co robimy", "channels": ["kanal 1", "kanal 2"], "kpi": "Co mierzymy"},
      {"phase": "Optymalizacja (Tydzien 9-12)", "objectives": "Co robimy", "channels": ["kanal 1"], "kpi": "Co mierzymy"}
    ],
    "budgetSplit": {
      "atl": "Sugerowany % budzetu i uzasadnienie",
      "digital": "Sugerowany % budzetu i uzasadnienie",
      "social": "Sugerowany % budzetu i uzasadnienie",
      "activations": "Sugerowany % budzetu i uzasadnienie",
      "production": "Sugerowany % budzetu i uzasadnienie"
    },
    "risks": [
      {"risk": "Ryzyko 1", "mitigation": "Jak je zminimalizowac"},
      {"risk": "Ryzyko 2", "mitigation": "Jak je zminimalizowac"}
    ],
    "nextSteps": ["Kolejny krok 1 do podjecia", "krok 2", "krok 3", "krok 4"]
  }
}`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
      }

      let fullText = ''
      let sentDone = false

      try {
        const anthropicStream = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 16000,
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

        console.log('Wlasny brief finished, length:', fullText.length)
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
            const fixed = clean.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, (m) =>
              m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
            )
            try { parsed = JSON.parse(fixed) } catch {}
            if (!parsed) {
              const noCommas = fixed.replace(/,(\s*[}\]])/g, '$1')
              try { parsed = JSON.parse(noCommas) } catch {}
            }
          }

          if (!parsed) {
            try {
              let repaired = fullText.slice(start)
              const lastValidEnd = Math.max(repaired.lastIndexOf('}'), repaired.lastIndexOf(']'))
              if (lastValidEnd > 0) repaired = repaired.slice(0, lastValidEnd + 1)
              let openBraces = 0, openBrackets = 0, inString = false, escape = false
              for (let i = 0; i < repaired.length; i++) {
                const ch = repaired[i]
                if (escape) { escape = false; continue }
                if (ch === '\\') { escape = true; continue }
                if (ch === '"') { inString = !inString; continue }
                if (inString) continue
                if (ch === '{') openBraces++
                if (ch === '}') openBraces--
                if (ch === '[') openBrackets++
                if (ch === ']') openBrackets--
              }
              while (openBrackets > 0) { repaired += ']'; openBrackets-- }
              while (openBraces > 0) { repaired += '}'; openBraces-- }
              repaired = repaired.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, (m) =>
                m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
              )
              repaired = repaired.replace(/,(\s*[}\]])/g, '$1')
              parsed = JSON.parse(repaired)
              console.log('Parsed truncated JSON via repair')
            } catch {}
          }

          if (parsed) {
            console.log('Wlasny brief parsed OK')
            send({ done: true, data: parsed })
          } else {
            console.error('Wlasny brief parse failed')
            send({ error: 'Nie mozna przetworzyc JSON' })
          }
          sentDone = true
        }
      } catch (err) {
        console.error('Wlasny brief error:', err)
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
