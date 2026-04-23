'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function InvitePage() {
  const { token } = useParams()
  const router = useRouter()
  const [invite, setInvite] = useState<{email?:string;plan?:string;expires_at?:string;used_at?:string}|null>(null)
  const [status, setStatus] = useState<'loading'|'valid'|'invalid'|'used'|'expired'>('loading')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function checkInvite() {
      const { data, error } = await supabase
        .from('invites').select('*').eq('token', token).single()
      if (error || !data) { setStatus('invalid'); return }
      if (data.used_at) { setStatus('used'); return }
      if (new Date(data.expires_at) < new Date()) { setStatus('expired'); return }
      setInvite(data)
      if (data.email) setEmail(data.email)
      setStatus('valid')
    }
    checkInvite()
  }, [token])

  async function markInviteUsed(userId: string) {
    await supabase.from('invites').update({
      used_by: userId,
      used_at: new Date().toISOString()
    }).eq('token', token)
    if (invite?.plan) {
      await supabase.from('profiles').update({ plan: invite.plan }).eq('id', userId)
    }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) throw error
      if (data.user) await markInviteUsed(data.user.id)
      router.push('/onboarding')
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Błąd rejestracji') }
    finally { setLoading(false) }
  }

  async function loginWithGoogle() {
    // Store invite token in localStorage so callback can pick it up
    localStorage.setItem('pending_invite_token', token as string)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?invite=${token}`
      }
    })
  }

  const PLAN_LABEL: Record<string,string> = { free:'Free', pro:'Pro 🚀', agency:'Agency ⭐' }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500 rounded-2xl mb-4"
            style={{boxShadow:'0 0 24px rgba(99,102,241,0.4)'}}>
            <span className="text-white text-xl">✦</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">SocialMind</h1>
        </div>

        {status === 'loading' && (
          <div className="text-center text-gray-500">Sprawdzam zaproszenie...</div>
        )}

        {status === 'invalid' && (
          <div className="card text-center py-8">
            <p className="text-4xl mb-3">❌</p>
            <p className="text-white font-semibold">Nieprawidłowe zaproszenie</p>
            <p className="text-gray-500 text-sm mt-1">Ten link nie istnieje lub jest błędny</p>
          </div>
        )}

        {status === 'used' && (
          <div className="card text-center py-8">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-white font-semibold">Zaproszenie już wykorzystane</p>
            <p className="text-gray-500 text-sm mt-1">Ten link był już użyty do rejestracji</p>
            <button onClick={() => router.push('/login')} className="btn-primary mt-4 px-6">Zaloguj się</button>
          </div>
        )}

        {status === 'expired' && (
          <div className="card text-center py-8">
            <p className="text-4xl mb-3">⏰</p>
            <p className="text-white font-semibold">Zaproszenie wygasło</p>
            <p className="text-gray-500 text-sm mt-1">Poproś o nowy link zaproszenia</p>
          </div>
        )}

        {status === 'valid' && (
          <div className="rounded-2xl p-6" style={{background:'#181c27',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full mb-3"
                style={{background:'rgba(99,102,241,0.15)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.3)'}}>
                ✉️ Zaproszenie · Plan {PLAN_LABEL[invite?.plan || 'pro']}
              </div>
              <h2 className="text-lg font-semibold text-white">Utwórz konto</h2>
              <p className="text-gray-500 text-sm">Zostałeś zaproszony do SocialMind</p>
            </div>

            {/* Google first — most common */}
            <button onClick={loginWithGoogle} disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium text-gray-300 transition-all hover:bg-white/5 mb-4"
              style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
              </svg>
              Zarejestruj się przez Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{background:'rgba(255,255,255,0.06)'}}/>
              <span className="text-xs text-gray-600">lub przez email</span>
              <div className="flex-1 h-px" style={{background:'rgba(255,255,255,0.06)'}}/>
            </div>

            <form onSubmit={register} className="space-y-3">
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={email}
                  onChange={e=>setEmail(e.target.value)} required
                  readOnly={!!invite?.email}/>
              </div>
              <div>
                <label className="label">Hasło</label>
                <input type="password" className="input" placeholder="Minimum 6 znaków"
                  value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}/>
              </div>
              {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
              <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                {loading ? 'Tworzę konto...' : 'Zarejestruj się przez email →'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
