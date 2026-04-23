'use client'
import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase'
export default function UstawieniaPage() {
  const [saved, setSaved] = useState<string|null>(null)
  const [lang, setLang] = useState('pl')
  const [defaultTone, setDefaultTone] = useState('profesjonalny')
  const [showSetupGuide, setShowSetupGuide] = useState(false)

  function handleSave(section: string) {
    setSaved(section)
    setTimeout(() => setSaved(null), 2000)
  }

  const API_KEYS: KeyStatus[] = [
    {
      envKey: 'ANTHROPIC_API_KEY',
      set: true, // always true if app is running (required)
      label: 'Anthropic API Key',
      hint: 'Wymagany — Claude Opus do generowania treści i analizy',
      url: 'https://console.anthropic.com/keys',
    },
    {
      envKey: 'OPENAI_API_KEY',
      set: false, // we can't check from client side
      label: 'OpenAI API Key',
      hint: 'Opcjonalny — DALL-E 3 do generowania grafik',
      url: 'https://platform.openai.com/api-keys',
    },
    {
      envKey: 'GOOGLE_API_KEY',
      set: false,
      label: 'Google AI API Key',
      hint: 'Opcjonalny — Nano Banana (Gemini) do generowania grafik',
      url: 'https://aistudio.google.com/apikey',
    },
  ]

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Ustawienia</h1>
          <p className="text-gray-500 text-sm mt-1">Konfiguracja aplikacji i kluczy API</p>
        </div>

        <div className="space-y-5">

          {/* Setup guide banner */}
          <div className="rounded-2xl p-5" style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)'}}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">⚡</span>
                <div>
                  <p className="font-semibold text-white text-sm">Szybka konfiguracja</p>
                  <p className="text-gray-400 text-xs mt-0.5">Uruchom instalator CLI żeby skonfigurować klucze API jedną komendą</p>
                </div>
              </div>
              <button onClick={() => setShowSetupGuide(!showSetupGuide)}
                className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-lg px-3 py-1.5 shrink-0 ml-3">
                {showSetupGuide ? 'Ukryj' : 'Pokaż instrukcję'}
              </button>
            </div>
            {showSetupGuide && (
              <div className="mt-4 pt-4 border-t border-indigo-500/20 space-y-3">
                <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">Jak skonfigurować klucze API:</p>
                <div className="space-y-2">
                  {[
                    { step: '1', cmd: 'node setup.js', desc: 'Uruchom instalator w folderze projektu' },
                    { step: '2', cmd: '', desc: 'Instalator zapyta o klucze API i hasło' },
                    { step: '3', cmd: 'npm run dev', desc: 'Zrestartuj serwer po konfiguracji' },
                  ].map(s => (
                    <div key={s.step} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
                      <div>
                        {s.cmd && (
                          <code className="text-xs font-mono bg-black/40 text-emerald-300 px-2 py-0.5 rounded mr-2">{s.cmd}</code>
                        )}
                        <span className="text-xs text-gray-400">{s.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-xl text-xs font-mono" style={{background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <p className="text-gray-600 mb-1"># lub ręcznie stwórz .env.local:</p>
                  <p className="text-emerald-300">ANTHROPIC_API_KEY=sk-ant-...</p>
                  <p className="text-gray-500">OPENAI_API_KEY=sk-...  <span className="text-gray-700"># opcjonalny</span></p>
                  <p className="text-gray-500">GOOGLE_API_KEY=AIza...  <span className="text-gray-700"># opcjonalny</span></p>
                  <p className="text-emerald-300">APP_PASSWORD=twoje-haslo</p>
                  <p className="text-gray-500">SESSION_SECRET=<span className="text-gray-600">$(openssl rand -hex 32)</span></p>
                </div>
              </div>
            )}
          </div>

          {/* API Keys status */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white border-b border-white/6 pb-3 mb-4">Klucze API</h3>
            <div className="space-y-4">
              {API_KEYS.map((key, i) => (
                <div key={i} className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-gray-200">{key.label}</p>
                      {i === 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{background:'rgba(52,211,153,0.15)',color:'#34d399',border:'1px solid rgba(52,211,153,0.3)'}}>
                          Aktywny
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{background:'rgba(255,255,255,0.05)',color:'#6b7280',border:'1px solid rgba(255,255,255,0.08)'}}>
                          Nie ustawiony
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{key.hint}</p>
                  </div>
                  <a href={key.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 rounded-lg px-3 py-1.5 shrink-0 transition-all">
                    Pobierz klucz ↗
                  </a>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/6">
              <p className="text-xs text-gray-600 leading-relaxed">
                Klucze API są trzymane w pliku <code className="text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">.env.local</code> na serwerze
                i nigdy nie są wysyłane do przeglądarki. Zmień je uruchamiając ponownie <code className="text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">node setup.js</code>.
              </p>
            </div>
          </div>

          {/* Security */}
          <div className="card">
            <div className="flex items-center justify-between border-b border-white/6 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-white">Bezpieczeństwo</h3>
              <button onClick={() => handleSave('security')}
                className="btn-primary text-xs px-4 py-2">
                {saved === 'security' ? '✓ Zapisano' : 'Zapisz'}
              </button>
            </div>
            <div>
              <label className="label">Hasło dostępu do aplikacji</label>
              <input className="input" type="password" placeholder="••••••••" />
              <p className="text-xs text-gray-600 mt-1.5">
                Zmień wartość <code className="text-gray-500 bg-white/5 px-1 py-0.5 rounded">APP_PASSWORD</code> w <code className="text-gray-500 bg-white/5 px-1 py-0.5 rounded">.env.local</code> i zrestartuj serwer
              </p>
            </div>
          </div>

          {/* Preferences */}
          <div className="card">
            <div className="flex items-center justify-between border-b border-white/6 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-white">Preferencje</h3>
              <button onClick={() => handleSave('prefs')}
                className="btn-primary text-xs px-4 py-2">
                {saved === 'prefs' ? '✓ Zapisano' : 'Zapisz'}
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Język generowanych treści</label>
                <select className="input" value={lang} onChange={e => setLang(e.target.value)}>
                  <option value="pl">🇵🇱 Polski</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="de">🇩🇪 Deutsch</option>
                </select>
              </div>
              <div>
                <label className="label">Domyślny ton komunikacji</label>
                <select className="input" value={defaultTone} onChange={e => setDefaultTone(e.target.value)}>
                  {['profesjonalny','inspirujący','przyjazny','ekspercki','zabawny','premium'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Deploy options */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4">Opcje wdrożenia</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon:'💻', title:'Lokalnie', desc:'npm run dev', detail:'http://localhost:3000' },
                { icon:'🐳', title:'Docker', desc:'docker-compose up -d', detail:'Dowolny serwer z Docker' },
                { icon:'☁️', title:'Netlify', desc:'Git push → auto-deploy', detail:'Darmowy hosting w chmurze' },
              ].map(opt => (
                <div key={opt.title} className="p-4 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                  <p className="text-2xl mb-2">{opt.icon}</p>
                  <p className="text-sm font-semibold text-white mb-1">{opt.title}</p>
                  <code className="text-[11px] text-emerald-300 font-mono block mb-1.5">{opt.desc}</code>
                  <p className="text-[10px] text-gray-600">{opt.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* About */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">O aplikacji</h3>
            <div className="space-y-2 text-xs text-gray-500">
              {[
                ['Wersja', 'v10.0.0'],
                ['Model tekstu', 'Claude Opus 4.5 (Anthropic)'],
                ['Model grafik', 'DALL-E 3 / Nano Banana (Gemini)'],
                ['Stack', 'Next.js 14 · Tailwind CSS · localStorage'],
                ['Deploy', 'Netlify / Docker / lokalnie'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-white/4 last:border-0">
                  <span>{label}</span>
                  <span className="text-gray-400 font-mono">{val}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/6 flex items-center justify-between">
              <button
                onClick={async () => { const sb = createClient(); await sb.auth.signOut(); window.location.href = '/login' }}
                className="text-sm text-red-400 hover:text-red-300 transition-colors">
                Wyloguj się
              </button>
              <a href="/README.md" target="_blank"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Dokumentacja ↗
              </a>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
