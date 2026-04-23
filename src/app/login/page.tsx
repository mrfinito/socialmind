'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login'|'register'|'magic'>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setMessage('')
    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
        })
        if (error) throw error
        setMessage('Sprawdź skrzynkę mailową — wysłaliśmy link do logowania!')
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
        })
        if (error) throw error
        setMessage('Sprawdź skrzynkę mailową i potwierdź rejestrację!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
        router.refresh()
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Błąd logowania'
      setError(msg.includes('Invalid login') ? 'Nieprawidłowy email lub hasło' : msg)
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500 rounded-2xl mb-4"
            style={{boxShadow:'0 0 24px rgba(99,102,241,0.4)'}}>
            <span className="text-white text-xl">✦</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">SocialMind</h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered Social Media Manager</p>
        </div>

        <div className="rounded-2xl p-6 space-y-4" style={{background:'#181c27',border:'1px solid rgba(255,255,255,0.06)'}}>
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.04)'}}>
            {[
              {id:'login',label:'Zaloguj'},
              {id:'register',label:'Rejestracja'},
              {id:'magic',label:'Magic link'},
            ].map(m => (
              <button key={m.id} onClick={() => { setMode(m.id as typeof mode); setError(''); setMessage('') }}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                style={{background:mode===m.id?'rgba(99,102,241,0.3)':'transparent',color:mode===m.id?'#a5b4fc':'#6b7280'}}>
                {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="ty@firma.pl"
                value={email} onChange={e=>setEmail(e.target.value)} required autoFocus />
            </div>
            {mode !== 'magic' && (
              <div>
                <label className="label">Hasło</label>
                <input type="password" className="input" placeholder="••••••••"
                  value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} />
              </div>
            )}
            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
            {message && <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">{message}</p>}
            <button type="submit" className="btn-primary w-full py-3" disabled={loading || !email}>
              {loading ? 'Ładowanie...' : mode === 'login' ? 'Zaloguj się →' : mode === 'register' ? 'Zarejestruj się →' : 'Wyślij magic link →'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{background:'rgba(255,255,255,0.06)'}}/>
            <span className="text-xs text-gray-600">lub</span>
            <div className="flex-1 h-px" style={{background:'rgba(255,255,255,0.06)'}}/>
          </div>

          <button onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 transition-all hover:bg-white/5"
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            Kontynuuj z Google
          </button>
        </div>

        <p className="text-center text-xs text-gray-700 mt-4">
          Rejestrując się, akceptujesz warunki korzystania z usługi
        </p>
      </div>
    </div>
  )
}
