# Tavily Search API — setup wyszukiwarki

SocialMind używa **Tavily Search API** do wyszukiwań w internecie. Tavily to wyszukiwarka zaprojektowana specjalnie dla aplikacji AI — zwraca pełną treść stron (nie tylko snippety) i ma free tier który wystarcza dla większości agencji.

## Plan cenowy

| Plan | Cena | Limit |
|---|---|---|
| **Free** | $0 / mies | 1000 zapytań / mies |
| **Pay-as-you-go** | $0.008 / zapytanie | bez limitu |

1000 zapytań to średnio **~30 zapytań dziennie** — wystarczy dla większości agencji obsługujących kilkudziesięciu klientów.

## Setup

### 1. Załóż konto na Tavily

1. Wejdź na [tavily.com](https://tavily.com)
2. Kliknij **"Get API Key"** (góra prawa)
3. Załóż konto przez Google lub email
4. W dashboardzie znajdziesz swój API key (zaczyna się od `tvly-`)

### 2. Dodaj klucz do Vercel

1. Otwórz projekt SocialMind w Vercel
2. **Settings** → **Environment Variables**
3. Dodaj nową zmienną:
   - **Name:** `TAVILY_API_KEY`
   - **Value:** `tvly-...` (twój klucz)
   - **Environments:** Production, Preview, Development (wszystkie)
4. Kliknij **Save**
5. Wymuś redeploy: **Deployments** → ostatni deploy → menu (`⋮`) → **Redeploy**

### 3. (Opcjonalnie) lokalnie w `.env.local`

Jeśli pracujesz z aplikacją lokalnie:

```
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Gdzie wyszukiwarka jest używana

Po dodaniu klucza, wyszukiwanie aktywuje się automatycznie w 4 miejscach:

### 1. **Konkurencja** (`/konkurencja`)
Po wpisaniu nazwy konkurenta, AI wyszukuje aktualne informacje o firmie i dane o ich strategii social media. Analiza zawiera prawdziwe dane zamiast zgadywanych.

W wyniku pojawia się banner **"🌐 Wzbogacono o dane z internetu"** + lista źródeł do rozwinięcia.

### 2. **RTM Generator** (`/rtm`)
Przed wygenerowaniem okazji RTM, AI pobiera **najnowsze wydarzenia z ostatnich 2 dni** i trendy z branży. Dzięki temu RTM jest faktycznie real-time, a nie oparty na wiedzy AI z trainingu.

### 3. **Newsy branżowe** (`/news`)
Obok pola wyszukiwania pojawia się przycisk **"🌐 Google News"** — kliknięcie wyszukuje świeże artykuły w internecie (ostatnie 7 dni) i dokleja je do listy newsów. Idealne gdy RSS branżowe nie pokrywają tematu który Cię interesuje.

### 4. **Generic search endpoint** (`/api/search`)
Każdy nowy moduł aplikacji może użyć `tavilySearch()` z `lib/tavily.ts`:

```typescript
import { tavilySearch, formatSearchForPrompt } from '@/lib/tavily'

const result = await tavilySearch('najnowsze trendy w marketingu B2B', {
  topic: 'news',     // 'general' | 'news'
  maxResults: 5,
  days: 7,           // tylko dla news: ostatnie N dni
  searchDepth: 'basic',  // 'basic' (1 credit) | 'advanced' (2 credits)
  includeDomains: ['wirtualnemedia.pl', 'press.pl'],  // opcjonalnie
})

if (result) {
  const context = formatSearchForPrompt(result.results)
  // wyślij `context` do Claude jako część prompta
}
```

## Co się dzieje gdy klucz brakuje

Aplikacja **działa normalnie** — wszystkie funkcje są dostępne, ale bez wzbogacenia o dane z internetu. Konkurencja zgaduje dane, RTM bazuje tylko na wiedzy Claude, News pokazuje tylko RSS.

Tavily helper zwraca `null` jeśli klucz nie jest ustawiony, więc każdy moduł degraduje wdzięcznie. **Nic się nie wywala.**

## Monitoring użycia

W dashboardzie Tavily ([app.tavily.com/usage](https://app.tavily.com/usage)) widzisz:
- Liczba zapytań w bieżącym miesiącu
- Pozostały limit free tier
- Historia zapytań (z queries i czasem)

**Wskazówka:** jeśli zbliżasz się do limitu 1000/mies, możesz w `lib/tavily.ts` zmienić `searchDepth` z `'basic'` na `'advanced'` żeby dostać lepsze wyniki (kosztują 2 credits zamiast 1) tylko dla najważniejszych modułów (np. RTM), a inne (np. konkurencja) zostawić na `'basic'`.

## Troubleshooting

**Banner "🌐 Wzbogacono o dane z internetu" nigdy się nie pojawia w Konkurencji**
→ Klucz nie jest dodany. Sprawdź **Settings → Environment Variables** w Vercel.

**Błąd "Tavily: nieprawidłowy API key"**
→ Klucz został odwołany lub źle skopiowany. Wygeneruj nowy w dashboardzie Tavily.

**Błąd "Tavily: przekroczono limit zapytań"**
→ Wykorzystałeś 1000 zapytań w tym miesiącu. Dodaj kartę kredytową w Tavily aby kontynuować ($0.008/zapytanie) lub poczekaj do nowego miesiąca.

**Wyszukiwanie zwraca puste wyniki**
→ Niektóre nisze mają mało dostępnych źródeł. Spróbuj bardziej ogólnej frazy.
