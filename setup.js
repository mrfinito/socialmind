#!/usr/bin/env node

/**
 * SocialMind — Instalator
 * Uruchom: node setup.js
 */

const readline = require('readline')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const RESET = '\x1b[0m'
const BOLD  = '\x1b[1m'
const DIM   = '\x1b[2m'
const GREEN = '\x1b[32m'
const BLUE  = '\x1b[34m'
const CYAN  = '\x1b[36m'
const YELLOW= '\x1b[33m'
const RED   = '\x1b[31m'
const WHITE = '\x1b[37m'

function c(color, text) { return color + text + RESET }
function log(text = '') { console.log(text) }
function ok(text) { log(c(GREEN, '  ✓ ') + text) }
function info(text) { log(c(CYAN, '  → ') + text) }
function warn(text) { log(c(YELLOW, '  ⚠ ') + text) }
function err(text) { log(c(RED, '  ✗ ') + text) }
function header(text) { log('\n' + c(BOLD + BLUE, '  ' + text)) }
function divider() { log(c(DIM, '  ' + '─'.repeat(52))) }

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function ask(question, defaultVal = '', secret = false) {
  return new Promise(resolve => {
    const hint = defaultVal ? c(DIM, ` [${defaultVal}]`) : ''
    const prefix = secret ? c(YELLOW, '  🔑 ') : c(CYAN, '  › ')
    process.stdout.write(prefix + question + hint + ': ')

    if (secret) {
      // Hide input for passwords/keys
      const stdin = process.stdin
      let val = ''
      stdin.setRawMode(true)
      stdin.resume()
      stdin.setEncoding('utf8')
      const onData = (ch) => {
        ch = ch.toString()
        if (ch === '\n' || ch === '\r' || ch === '\u0004') {
          stdin.setRawMode(false)
          stdin.pause()
          stdin.removeListener('data', onData)
          process.stdout.write('\n')
          resolve(val || defaultVal)
        } else if (ch === '\u0003') {
          process.exit()
        } else if (ch === '\u007f' || ch === '\b') {
          if (val.length > 0) { val = val.slice(0, -1); process.stdout.write('\b \b') }
        } else {
          val += ch
          process.stdout.write('•')
        }
      }
      stdin.on('data', onData)
    } else {
      rl.question('', (answer) => {
        resolve(answer.trim() || defaultVal)
      })
    }
  })
}

async function checkNodeVersion() {
  const [major] = process.versions.node.split('.').map(Number)
  if (major < 18) {
    err(`Node.js ${process.versions.node} jest za stary. Wymagany: v18+`)
    err('Pobierz nowszą wersję: https://nodejs.org')
    process.exit(1)
  }
}

function checkEnvExists() {
  return fs.existsSync(path.join(process.cwd(), '.env.local'))
}

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex')
}

function validateAnthropicKey(key) {
  return key.startsWith('sk-ant-') && key.length > 20
}

function validateOpenAIKey(key) {
  return key.startsWith('sk-') && key.length > 20
}

function validateGoogleKey(key) {
  return key.startsWith('AIza') && key.length > 20
}

async function main() {
  console.clear()
  log()
  log(c(BOLD + BLUE, '  ╔══════════════════════════════════════════╗'))
  log(c(BOLD + BLUE, '  ║') + c(BOLD + WHITE, '        ✦  SocialMind — Instalator        ') + c(BOLD + BLUE, '║'))
  log(c(BOLD + BLUE, '  ║') + c(DIM, '     AI-powered Social Media Manager      ') + c(BOLD + BLUE, '║'))
  log(c(BOLD + BLUE, '  ╚══════════════════════════════════════════╝'))
  log()

  await checkNodeVersion()
  ok(`Node.js ${process.versions.node}`)

  if (checkEnvExists()) {
    warn('.env.local już istnieje')
    const overwrite = await ask('Nadpisać istniejącą konfigurację? (t/n)', 'n')
    if (overwrite.toLowerCase() !== 't' && overwrite.toLowerCase() !== 'tak') {
      info('Instalacja anulowana. Twoja konfiguracja jest nienaruszona.')
      rl.close(); return
    }
  }

  // ── KROK 1: Anthropic ─────────────────────────────────────────
  header('KROK 1 — Klucz API Anthropic (wymagany)')
  divider()
  info('Pobierz klucz na: https://console.anthropic.com/keys')
  info('Format: sk-ant-api03-...')
  log()

  let anthropicKey = ''
  while (!anthropicKey) {
    anthropicKey = await ask('Anthropic API Key', '', true)
    if (!validateAnthropicKey(anthropicKey)) {
      err('Nieprawidłowy klucz. Powinien zaczynać się od sk-ant-')
      anthropicKey = ''
    } else {
      ok('Klucz Anthropic wygląda poprawnie')
    }
  }

  // ── KROK 2: OpenAI (opcjonalny) ───────────────────────────────
  header('KROK 2 — Klucz API OpenAI (opcjonalny, dla DALL-E 3)')
  divider()
  info('Pobierz klucz na: https://platform.openai.com/api-keys')
  info('Pomiń Enter jeśli nie chcesz używać DALL-E 3')
  log()

  let openaiKey = await ask('OpenAI API Key', 'pomiń', true)
  if (openaiKey === 'pomiń' || !validateOpenAIKey(openaiKey)) {
    if (openaiKey !== 'pomiń') warn('Klucz OpenAI wygląda niepoprawnie — zostanie pominięty')
    else info('DALL-E 3 pominięty — możesz dodać klucz później w Ustawieniach')
    openaiKey = ''
  } else {
    ok('Klucz OpenAI wygląda poprawnie')
  }

  // ── KROK 3: Google (opcjonalny) ───────────────────────────────
  header('KROK 3 — Klucz API Google (opcjonalny, dla Nano Banana/Gemini)')
  divider()
  info('Pobierz klucz na: https://aistudio.google.com/apikey')
  info('Format: AIza...')
  log()

  let googleKey = await ask('Google AI API Key', 'pomiń', true)
  if (googleKey === 'pomiń' || !validateGoogleKey(googleKey)) {
    if (googleKey !== 'pomiń') warn('Klucz Google wygląda niepoprawnie — zostanie pominięty')
    else info('Nano Banana pominięty — możesz dodać klucz później w Ustawieniach')
    googleKey = ''
  } else {
    ok('Klucz Google wygląda poprawnie')
  }

  // ── KROK 3b: Supabase ────────────────────────────────────────
  header('KROK 3b — Supabase (auth i baza danych — opcjonalny)')
  divider()
  info('Załóż darmowe konto na: https://supabase.com')
  info('Skopiuj dane z: Project Settings → API')
  log()

  const supabaseUrl = await ask('Supabase Project URL', 'pomiń')
  const supabaseAnon = supabaseUrl !== 'pomiń' ? await ask('Supabase Anon Key', '', true) : ''
  const supabaseService = supabaseUrl !== 'pomiń' ? await ask('Supabase Service Role Key', '', true) : ''
  if (supabaseUrl !== 'pomiń') ok('Supabase skonfigurowany')
  else info('Supabase pominięty — aplikacja użyje localStorage')

  // ── KROK 4: Hasło dostępu ─────────────────────────────────────
  header('KROK 4 — Hasło dostępu do aplikacji')
  divider()
  info('To hasło chroni Twoją aplikację przed nieautoryzowanym dostępem')
  log()

  let password = ''
  while (password.length < 6) {
    password = await ask('Hasło dostępu (min. 6 znaków)', '', true)
    if (password.length < 6) err('Hasło musi mieć co najmniej 6 znaków')
  }

  let password2 = ''
  while (password2 !== password) {
    password2 = await ask('Powtórz hasło', '', true)
    if (password2 !== password) err('Hasła nie są identyczne')
  }
  ok('Hasło ustawione')

  // ── GENERUJ SESSION SECRET ─────────────────────────────────────
  const sessionSecret = generateSecret(32)
  ok('Session secret wygenerowany automatycznie')

  // ── ZAPISZ .env.local ─────────────────────────────────────────
  header('KROK 5 — Zapisuję konfigurację')
  divider()

  const envContent = `# SocialMind — Konfiguracja
# Wygenerowano: ${new Date().toLocaleString('pl')}
# NIE commituj tego pliku do Git!

# ── Anthropic (Claude) — WYMAGANY ──────────────────────────────
ANTHROPIC_API_KEY=${anthropicKey}

# ── OpenAI (DALL-E 3) — opcjonalny ────────────────────────────
${openaiKey ? `OPENAI_API_KEY=${openaiKey}` : '# OPENAI_API_KEY=sk-...  (odkomentuj i uzupełnij)'}

# ── Google AI (Nano Banana/Gemini) — opcjonalny ────────────────
${googleKey ? `GOOGLE_API_KEY=${googleKey}` : '# GOOGLE_API_KEY=AIza...  (odkomentuj i uzupełnij)'}

# ── Supabase — auth i baza danych ─────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl || '# https://xxx.supabase.co'}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnon || '# eyJ...'}
SUPABASE_SERVICE_ROLE_KEY=${supabaseService || '# eyJ...'}

# ── Legacy (nieużywane po migracji na Supabase) ────────────────
APP_PASSWORD=${password}
SESSION_SECRET=${sessionSecret}
`

  const envPath = path.join(process.cwd(), '.env.local')
  fs.writeFileSync(envPath, envContent, { mode: 0o600 }) // only owner can read
  ok('.env.local zapisany (uprawnienia: 600)')

  // ── SPRAWDŹ npm install ────────────────────────────────────────
  header('KROK 6 — Sprawdzam zależności')
  divider()

  const nodeModulesExists = fs.existsSync(path.join(process.cwd(), 'node_modules'))
  if (!nodeModulesExists) {
    info('node_modules nie istnieje — uruchom: npm install')
  } else {
    ok('node_modules już istnieje')
  }

  // ── PODSUMOWANIE ──────────────────────────────────────────────
  log()
  log(c(BOLD + GREEN, '  ╔══════════════════════════════════════════╗'))
  log(c(BOLD + GREEN, '  ║') + c(BOLD + WHITE, '          ✓  Instalacja gotowa!           ') + c(BOLD + GREEN, '║'))
  log(c(BOLD + GREEN, '  ╚══════════════════════════════════════════╝'))
  log()

  log(c(BOLD, '  Co dalej:'))
  log()
  if (!nodeModulesExists) {
    log(c(CYAN, '  1.') + '  npm install')
    log(c(CYAN, '  2.') + '  npm run dev')
  } else {
    log(c(CYAN, '  1.') + '  npm run dev')
  }
  log(c(CYAN, '  2.') + '  Otwórz: ' + c(BOLD, 'http://localhost:3000'))
  log(c(CYAN, '  3.') + '  Zaloguj się hasłem które właśnie ustawiłeś')
  log()

  log(c(DIM, '  Klucze zapisane w: .env.local'))
  log(c(DIM, '  Możesz je zmienić edytując plik lub uruchamiając node setup.js ponownie'))
  log()

  rl.close()
}

main().catch(e => {
  err('Błąd instalatora: ' + e.message)
  rl.close()
  process.exit(1)
})
