# ✦ SocialMind — AI Social Media Manager

> Kompleksowe narzędzie do zarządzania social media zasilane przez Claude AI.
> Generator postów, Brand DNA, kampanie 360°, persona builder, social listening i wiele więcej.

---

## 🚀 Szybki start (3 metody)

### Metoda 1 — Lokalnie z instalatorem (najłatwiej)

**Wymagania:** Node.js 18+ ([nodejs.org](https://nodejs.org))

```bash
# 1. Pobierz i rozpakuj projekt
unzip socialmind.zip
cd socialmind

# 2. Uruchom instalator (poprowadzi Cię przez konfigurację)
node setup.js

# 3. Zainstaluj zależności i uruchom
npm install
npm run dev

# 4. Otwórz w przeglądarce
# http://localhost:3000
```

Instalator zapyta o:
- Klucz API Anthropic (wymagany) → [console.anthropic.com](https://console.anthropic.com/keys)
- Klucz API OpenAI (opcjonalny, dla DALL-E 3) → [platform.openai.com](https://platform.openai.com/api-keys)
- Klucz API Google (opcjonalny, dla Nano Banana) → [aistudio.google.com](https://aistudio.google.com/apikey)
- Hasło dostępu do aplikacji

---

### Metoda 2 — Docker (najłatwiejszy deploy)

**Wymagania:** Docker + Docker Compose ([docker.com](https://docker.com))

```bash
# 1. Rozpakuj projekt
unzip socialmind.zip && cd socialmind

# 2. Utwórz plik .env.local (lub uruchom node setup.js)
cp .env.example .env.local
# Edytuj .env.local i uzupełnij klucze

# 3. Uruchom
docker-compose up -d

# 4. Otwórz w przeglądarce
# http://localhost:3000

# Zatrzymaj
docker-compose down
```

---

### Metoda 3 — Netlify (deploy w chmurze)

**Wymagania:** Konto GitHub + konto Netlify (oba darmowe)

```bash
# 1. Wrzuć kod na GitHub
git init && git add .
git commit -m "init: SocialMind"
git remote add origin https://github.com/TWOJ_USER/socialmind.git
git push -u origin main

# 2. Zaloguj się na app.netlify.com
# → Add new site → Import from GitHub → wybierz repo
# → Netlify wykryje netlify.toml automatycznie → Deploy site

# 3. Ustaw zmienne środowiskowe w Netlify:
# Site configuration → Environment variables
```

| Zmienna | Gdzie pobrać |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com/keys](https://console.anthropic.com/keys) |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `GOOGLE_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `APP_PASSWORD` | Dowolne hasło (min. 6 znaków) |
| `SESSION_SECRET` | Losowy string: `openssl rand -hex 32` |

---

## 🔑 Klucze API — skąd i jak?

### Anthropic (Claude) — WYMAGANY
1. Wejdź na [console.anthropic.com](https://console.anthropic.com)
2. Zarejestruj się / zaloguj
3. Kliknij **API Keys** → **Create Key**
4. Skopiuj klucz (zaczyna się od `sk-ant-`)
5. **Billing**: dodaj kartę i minimum $5 — bez tego API nie działa

### OpenAI (DALL-E 3) — opcjonalny
1. Wejdź na [platform.openai.com](https://platform.openai.com)
2. Kliknij ikonę konta → **API Keys** → **Create new secret key**
3. Skopiuj klucz (zaczyna się od `sk-`)
4. Dodaj środki na koncie

### Google AI (Nano Banana) — opcjonalny
1. Wejdź na [aistudio.google.com](https://aistudio.google.com)
2. Kliknij **Get API key** → **Create API key**
3. Skopiuj klucz (zaczyna się od `AIza`)
4. Włącz billing w Google Cloud dla modeli image generation

> **Uwaga:** Bez klucza OpenAI lub Google generator grafik nie będzie działał — ale wszystkie funkcje tekstowe (generowanie postów, Brand DNA, kampanie itp.) działają tylko z kluczem Anthropic.

---

## 📱 Funkcje

| Moduł | Opis |
|---|---|
| **Generator postów** | Posty dla 6 platform z Brand DNA |
| **Brand DNA** | Automatyczna analiza marki z logo i dokumentów |
| **Kampania 360°** | Cały miesiąc contentu z jednego briefu |
| **Persona Builder** | 3 szczegółowe persony z psychologią i hookami |
| **Social Listening** | Monitoring wzmianek i analiza sentymentu |
| **Testy A/B** | 3 warianty posta z AI scoringiem |
| **Repurposing** | Artykuł/podcast → posty na wszystkie platformy |
| **Trendy** | Research hashtagów i tematów dla branży |
| **Analiza konkurencji** | Strategiczny raport vs konkurent |
| **Skrypty wideo** | TikTok/Reels z podziałem na sceny |
| **Scheduler** | Drag & drop kalendarz publikacji |
| **Biblioteka** | Historia postów z filtrami i statusami |
| **Projekty** | Multi-klient — osobne Brand DNA per projekt |
| **Raporty** | Miesięczne podsumowania dla klientów |
| **Edytor graficzny** | Canvas z logo overlay, text layers, export PNG |

---

## 🏗️ Stack techniczny

- **Framework:** Next.js 14 (App Router)
- **AI:** Claude Opus (Anthropic) — teksty i analiza
- **Grafiki:** DALL-E 3 (OpenAI) lub Nano Banana (Google Gemini)
- **Styling:** Tailwind CSS
- **Storage:** localStorage (dane lokalne)
- **Deploy:** Netlify / Docker / lokalnie

---

## ❓ FAQ

**Czy dane są bezpieczne?**
Wszystkie dane (Brand DNA, posty, projekty) są trzymane lokalnie w przeglądarce (localStorage). Nic nie jest wysyłane na zewnętrzne serwery poza zapytaniami do API (Anthropic/OpenAI/Google).

**Ile kosztuje używanie?**
Koszty zależą od używania API:
- Anthropic Claude Opus: ~$0.01-0.05 za generowanie posta
- DALL-E 3: ~$0.04 za grafikę
- Google Nano Banana: ~$0.04 za grafikę
Przy normalnym użytkowaniu (20-30 postów miesięcznie) koszt to ok. $5-15/miesiąc.

**Czy mogę używać bez klucza OpenAI/Google?**
Tak! Wszystkie funkcje tekstowe działają tylko z kluczem Anthropic. Generator grafik będzie niedostępny.

**Jak zmienić hasło?**
Edytuj `.env.local` (lokalnie) lub zmienne środowiskowe w Netlify, zmień `APP_PASSWORD` i zrestartuj aplikację.

---

## 🐛 Troubleshooting

**Błąd "invalid x-api-key"**
→ Sprawdź czy klucz Anthropic jest poprawny i czy masz środki na koncie

**Błąd "quota exceeded"**
→ Sprawdź billing w Google AI Studio — Nano Banana wymaga płatnego konta

**Aplikacja nie startuje**
→ Sprawdź czy port 3000 jest wolny: `lsof -i :3000` (Mac/Linux)

**Docker nie buduje**
→ Upewnij się że Docker Desktop jest uruchomiony

---

## 📞 Kontakt

Pytania i feedback: wpisz issue na GitHubie lub skontaktuj się bezpośrednio.

---

*SocialMind v10 — zbudowany z Claude Code + Next.js*
