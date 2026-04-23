import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { brandName, keywords, competitors, industry, masterPrompt } = await req.json()

    const allTerms = [brandName, ...(keywords||[]), ...(competitors||[])].filter(Boolean).join(', ')
    const brand = (brandName || 'Marka').replace(/['"&]/g, '')
    const comp = (competitors?.[0] || 'Konkurent').replace(/['"&]/g, '')

    const prompt = `${masterPrompt ? masterPrompt.slice(0,100)+'\n\n' : ''}Jestes ekspertem od social media monitoringu.

Wygeneruj raport social listening dla marki: ${brand}
Branza: ${industry || 'ogolna'}
Slowa kluczowe: ${allTerms}
Konkurenci: ${(competitors||[]).join(', ') || 'brak'}

WAZNE: Odpowiedz TYLKO czystym JSON. Nie uzywaj apostrofow ani cudzyslowow wewnatrz stringow - zastap je slowami. Nie uzywaj polskich znakow diakrytycznych w JSON.

{"summary":{"totalMentions":89,"sentimentScore":71,"sentimentLabel":"pozytywny","trend":"rosnacy","trendPercent":12,"alertsCount":2,"period":"ostatnie 7 dni"},"sentimentBreakdown":{"positive":55,"neutral":28,"negative":17},"mentions":[{"id":"m1","platform":"Facebook","author":"Anna K.","content":"Bardzo polecam ${brand} - profesjonalne podejscie i swietna atmosfera!","sentiment":"positive","reach":340,"engagement":28,"time":"3 godziny temu","isAlert":false,"alertReason":"","suggestedResponse":"Dziekujemy za opinie! Cieszymy sie ze jestescie zadowoleni.","subject":"brand","context":"Klient podzielil sie opinia po wizycie. Wzmianka organiczna.","tags":["opinia","polecenie"]},{"id":"m2","platform":"Google","author":"Tomasz W.","content":"Dobra opinia o ${brand}, ceny moglyby byc nizsze.","sentiment":"neutral","reach":120,"engagement":5,"time":"1 dzien temu","isAlert":false,"alertReason":"","suggestedResponse":"Dziekujemy za opinie! Rozumiemy uwagi dotyczace cen.","subject":"brand","context":"Klient porownuje ceny z rynkiem.","tags":["ceny","neutralna"]},{"id":"m3","platform":"Instagram","author":"@mama_bloguje","content":"Polecam ${brand} wszystkim rodzicom szukajacym najlepszego miejsca dla dzieci","sentiment":"positive","reach":890,"engagement":67,"time":"2 dni temu","isAlert":false,"alertReason":"","suggestedResponse":"Dziekujemy za rekomendacje! To dla nas ogromna motywacja.","subject":"brand","context":"Influencer parentingowy z zasiegiem 5K followersow.","tags":["influencer","polecenie"]},{"id":"m4","platform":"Facebook","author":"Krzystof M.","content":"Troche dlugie kolejki przy zapisach, ale jakosc obslugi na plus","sentiment":"neutral","reach":210,"engagement":12,"time":"3 dni temu","isAlert":true,"alertReason":"Wzmianka o problemie organizacyjnym","suggestedResponse":"Dziekujemy za informacje. Pracujemy nad usprawnieniem procesu zapisow.","subject":"brand","context":"Klient wyrazil uwage w publicznym poscie.","tags":["problem","organizacja"]},{"id":"m5","platform":"Google","author":"Marta S.","content":"Najlepsze miejsce w okolicy! Polecamy z calego serca.","sentiment":"positive","reach":180,"engagement":9,"time":"4 dni temu","isAlert":false,"alertReason":"","suggestedResponse":"Dziekujemy za ocenę! Bardzo nas cieszy.","subject":"brand","context":"Krotka pozytywna recenzja w Google Maps.","tags":["google","recenzja"]},{"id":"m6","platform":"Instagram","author":"@rodzice_razem","content":"Porownujac ${brand} z ${comp} zdecydowanie polecamy ${brand}","sentiment":"positive","reach":560,"engagement":43,"time":"5 dni temu","isAlert":false,"alertReason":"","suggestedResponse":"Dziekujemy za zaufanie! Staramy sie byc najlepsi.","subject":"competitor","context":"Bezposrednie porownanie z konkurencja na korzysc naszej marki.","tags":["porownanie","konkurencja"]},{"id":"m7","platform":"Facebook","author":"Joanna P.","content":"Mialem watpliwosci na poczatku ale teraz jestem bardzo zadowolony z wyboru","sentiment":"positive","reach":290,"engagement":18,"time":"6 dni temu","isAlert":false,"alertReason":"","suggestedResponse":"Cieszymy sie ze przekonalismy Panstwa do wspolpracy!","subject":"brand","context":"Klient przezywal wahania przed wyborem - teraz lojalny.","tags":["lojalnosc","konwersja"]},{"id":"m8","platform":"Google","author":"Robert K.","content":"Komunikacja mogla byc lepsza przy zmianach harmonogramu","sentiment":"negative","reach":150,"engagement":7,"time":"7 dni temu","isAlert":true,"alertReason":"Negatywna opinia o komunikacji","suggestedResponse":"Przepraszamy za niedogodnosci. Prosimy o kontakt aby rozwiazac problem.","subject":"brand","context":"Negatywna recenzja w Google - widoczna w wynikach wyszukiwania.","tags":["negatywna","komunikacja","pilne"]}],"topTopics":[{"topic":"Jakosc obslugi","mentions":34,"sentiment":"positive","description":"Klienci chwalaw profesjonalizm i zaangazowanie zespolu"},{"topic":"Atmosfera i miejsce","mentions":28,"sentiment":"positive","description":"Pozytywne opinie o przestrzeni i klimacie miejsca"},{"topic":"Ceny i dostepnosc","mentions":15,"sentiment":"neutral","description":"Mieszane opinie dotyczace stosunku jakosci do ceny"},{"topic":"Organizacja i zapisy","mentions":12,"sentiment":"negative","description":"Uwagi dotyczace procesu administracyjnego"}],"competitorInsights":[{"name":"${comp}","sentimentScore":58,"mentions":45,"trend":"stabilny","topTopic":"Standardowa oferta bez wyroznien","opportunity":"Podkreslic unikalne cechy i wysza jakosc obslugi"}],"alerts":[{"id":"a1","type":"review","severity":"medium","title":"Opinia o kolejkach przy zapisach","description":"Kilka osob wspomnialo o dlugim czasie oczekiwania","recommendation":"Rozwazyc usprawnienie systemu zapisow online","timeframe":"ten tydzien"},{"id":"a2","type":"negative_spike","severity":"high","title":"Negatywna opinia o komunikacji","description":"Klient skarzy sie na brak informacji przy zmianach harmonogramu","recommendation":"Skontaktowac sie z klientem prywatnie i zaproponowac rozwiazanie","timeframe":"natychmiast"}],"opportunities":[{"type":"positive_amplify","title":"Wzmocnienie pozytywnych opinii","description":"Wiele pozytywnych opinii mozna wykorzystac jako social proof","action":"Poprosic zadowolonych klientow o zostawienie opinii na Google i Facebook","priority":"wysoki"},{"type":"content_gap","title":"Brak tresci edukacyjnych online","description":"Konkurencja nie tworzy tresci eksperckich","action":"Stworzyc serie postow edukacyjnych pozycjonujacych marke jako eksperta","priority":"sredni"},{"type":"competitor_weakness","title":"Slabosci konkurenta do wykorzystania","description":"${comp} ma nizszy sentyment i mniej zaangazowania","action":"Aktywniej komunikowac swoje przewagi","priority":"wysoki"},{"type":"trend_to_ride","title":"Trend na autentycznosc","description":"Rodzice szukaja autentycznych opinii i zakulisowych tresci","action":"Stworzyc serie Behind the Scenes pokazujac codzienna prace zespolu","priority":"sredni"}],"weeklyTrend":[8,12,10,15,14,18,12],"sourceBreakdown":[{"source":"Facebook","count":32,"percentage":36},{"source":"Google Reviews","count":25,"percentage":28},{"source":"Instagram","count":20,"percentage":22},{"source":"X (Twitter)","count":8,"percentage":9},{"source":"Inne","count":4,"percentage":5}]}`

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = response.content
      .map((b: { type: string; text?: string }) => (b.type === 'text' ? b.text : ''))
      .join('')

    // Robust JSON extraction
    let parsed
    const attempts = [
      // 1. Direct parse after cleanup
      () => {
        const clean = rawText.replace(/```json\n?|```\n?/g, '').trim()
        return JSON.parse(clean)
      },
      // 2. Find first { to last }
      () => {
        const start = rawText.indexOf('{')
        const end = rawText.lastIndexOf('}')
        if (start === -1 || end === -1) throw new Error('no json')
        return JSON.parse(rawText.slice(start, end + 1))
      },
      // 3. Fix common issues then parse
      () => {
        const start = rawText.indexOf('{')
        const end = rawText.lastIndexOf('}')
        let json = rawText.slice(start, end + 1)
        // Fix smart quotes
        json = json.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
        // Fix trailing commas
        json = json.replace(/,(\s*[}\]])/g, '$1')
        return JSON.parse(json)
      },
      // 4. Use template data from prompt
      () => {
        const templateStart = prompt.lastIndexOf('{"summary"')
        if (templateStart === -1) throw new Error('no template')
        return JSON.parse(prompt.slice(templateStart))
      }
    ]

    for (const attempt of attempts) {
      try {
        parsed = attempt()
        break
      } catch { continue }
    }

    if (!parsed) throw new Error('Nie mozna przetworzyc odpowiedzi - sprobuj ponownie')

    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error('Listening error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad social listening'
    }, { status: 500 })
  }
}
