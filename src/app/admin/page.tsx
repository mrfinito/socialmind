'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'

// ─── Types ────────────────────────────────────────────────────
interface Permissions {
  can_generate_posts: boolean; can_kampania: boolean; can_persona: boolean
  can_listening: boolean; can_competitor: boolean; can_repurposing: boolean
  can_ab_testy: boolean; can_wideo: boolean; can_copywriter: boolean
  can_content_score: boolean; can_trendy: boolean; can_raport: boolean
  max_projects: number; max_posts_per_month: number
}
interface UserRow {
  id: string; email: string; created_at: string; last_sign_in: string
  provider: string
  profile: { plan?: string; full_name?: string; is_admin?: boolean; onboarded?: boolean }
  permissions: Permissions | null
  projects: number; drafts: number; monthly_drafts: number
}
interface Invite {
  id: string; token: string; email?: string; plan: string
  note?: string; used_at?: string; expires_at: string; created_at: string
}

// ─── Constants ────────────────────────────────────────────────
const PLAN_CFG: Record<string,{color:string;bg:string;border:string}> = {
  free:   {color:'#9ca3af',bg:'rgba(156,163,175,0.1)',border:'rgba(156,163,175,0.2)'},
  pro:    {color:'#a5b4fc',bg:'rgba(99,102,241,0.15)',border:'rgba(99,102,241,0.3)'},
  agency: {color:'#fbbf24',bg:'rgba(251,191,36,0.15)',border:'rgba(251,191,36,0.3)'},
}

const MODULE_LIST = [
  { key:'can_generate_posts', label:'Generator postów',    icon:'✦' },
  { key:'can_copywriter',     label:'AI Copywriter',       icon:'✍️' },
  { key:'can_content_score',  label:'Content Score',       icon:'📊' },
  { key:'can_kampania',       label:'Kampania 360°',       icon:'🚀' },
  { key:'can_persona',        label:'Persona Builder',     icon:'👤' },
  { key:'can_listening',      label:'Social Listening',    icon:'📡' },
  { key:'can_competitor',     label:'Analiza konkurencji', icon:'🔍' },
  { key:'can_repurposing',    label:'Smart Repurposing',   icon:'♻️' },
  { key:'can_ab_testy',       label:'Testy A/B',           icon:'🧪' },
  { key:'can_wideo',          label:'Skrypty wideo',       icon:'🎬' },
  { key:'can_trendy',         label:'Trendy',              icon:'📡' },
  { key:'can_raport',         label:'Raporty',             icon:'📈' },
]

const PLAN_PRESETS: Record<string, Partial<Permissions>> = {
  free: {
    can_generate_posts:true, can_copywriter:false, can_content_score:false,
    can_kampania:false, can_persona:false, can_listening:false,
    can_competitor:false, can_repurposing:false, can_ab_testy:false,
    can_wideo:false, can_trendy:true, can_raport:false,
    max_projects:1, max_posts_per_month:10,
  },
  pro: {
    can_generate_posts:true, can_copywriter:true, can_content_score:true,
    can_kampania:true, can_persona:true, can_listening:false,
    can_competitor:true, can_repurposing:true, can_ab_testy:true,
    can_wideo:true, can_trendy:true, can_raport:true,
    max_projects:10, max_posts_per_month:200,
  },
  agency: {
    can_generate_posts:true, can_copywriter:true, can_content_score:true,
    can_kampania:true, can_persona:true, can_listening:true,
    can_competitor:true, can_repurposing:true, can_ab_testy:true,
    can_wideo:true, can_trendy:true, can_raport:true,
    max_projects:999, max_posts_per_month:9999,
  },
}

const DEFAULT_PERMS: Permissions = {
  can_generate_posts:true, can_kampania:true, can_persona:true,
  can_listening:false, can_competitor:true, can_repurposing:true,
  can_ab_testy:true, can_wideo:true, can_copywriter:true,
  can_content_score:true, can_trendy:true, can_raport:true,
  max_projects:3, max_posts_per_month:50,
}

function PlanBadge({plan}:{plan:string}) {
  const cfg = PLAN_CFG[plan] || PLAN_CFG.free
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
    style={{background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`}}>{plan || 'free'}</span>
}

// ─── Permissions Editor Modal ─────────────────────────────────
function PermissionsModal({ user, onSave, onClose }: {
  user: UserRow
  onSave: (userId: string, perms: Permissions) => void
  onClose: () => void
}) {
  const [perms, setPerms] = useState<Permissions>(user.permissions || DEFAULT_PERMS)
  const [saving, setSaving] = useState(false)
  const [activePreset, setActivePreset] = useState<string|null>(null)

  function applyPreset(plan: string) {
    const preset = PLAN_PRESETS[plan]
    setPerms(prev => ({ ...prev, ...preset }))
    setActivePreset(plan)
  }

  function toggle(key: keyof Permissions) {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }))
    setActivePreset(null)
  }

  async function save() {
    setSaving(true)
    await onSave(user.id, perms)
    setSaving(false)
    onClose()
  }

  const enabledCount = MODULE_LIST.filter(m => perms[m.key as keyof Permissions]).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.75)'}} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{background:'#1a1f2e',border:'1px solid rgba(255,255,255,0.1)'}}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <div>
            <h2 className="text-base font-semibold text-white">Uprawnienia użytkownika</h2>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">✕</button>
        </div>

        <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Presets */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Szybkie presety</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(PLAN_PRESETS).map(plan => (
                <button key={plan} onClick={() => applyPreset(plan)}
                  className="py-2.5 rounded-xl text-sm font-semibold capitalize transition-all"
                  style={{
                    background: activePreset===plan ? PLAN_CFG[plan]?.bg : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${activePreset===plan ? PLAN_CFG[plan]?.border : 'rgba(255,255,255,0.08)'}`,
                    color: activePreset===plan ? PLAN_CFG[plan]?.color : '#6b7280',
                  }}>
                  {plan}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mt-1.5">Preset ustawia wszystkie poniższe wartości — możesz je potem zmienić ręcznie</p>
          </div>

          {/* Module toggles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dostęp do modułów</p>
              <span className="text-xs text-gray-600">{enabledCount}/{MODULE_LIST.length} aktywnych</span>
            </div>
            <div className="space-y-1.5">
              {MODULE_LIST.map(m => {
                const enabled = !!perms[m.key as keyof Permissions]
                return (
                  <button key={m.key} onClick={() => toggle(m.key as keyof Permissions)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                    style={{
                      background: enabled ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${enabled ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                    <span className="text-base w-6 text-center">{m.icon}</span>
                    <span className={`flex-1 text-sm text-left ${enabled?'text-gray-200':'text-gray-600'}`}>{m.label}</span>
                    <div className={`w-9 h-5 rounded-full transition-all relative ${enabled?'bg-indigo-500':'bg-gray-800'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled?'left-4':'left-0.5'}`}/>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Limits */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Limity</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Max projektów</label>
                <input type="number" className="input" min={1} max={999}
                  value={perms.max_projects}
                  onChange={e=>setPerms(prev=>({...prev,max_projects:+e.target.value}))}/>
              </div>
              <div>
                <label className="label">Max postów / miesiąc</label>
                <input type="number" className="input" min={1} max={9999}
                  value={perms.max_posts_per_month}
                  onChange={e=>setPerms(prev=>({...prev,max_posts_per_month:+e.target.value}))}/>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3"
          style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          <button onClick={onClose} className="btn-secondary flex-1">Anuluj</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Zapisuję...' : '💾 Zapisz uprawnienia'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'users'|'invites'>('users')
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState<UserRow|null>(null)

  // Invite form
  const [invEmail, setInvEmail] = useState('')
  const [invPlan, setInvPlan] = useState('pro')
  const [invNote, setInvNote] = useState('')
  const [invLoading, setInvLoading] = useState(false)
  const [newInviteUrl, setNewInviteUrl] = useState('')
  const [copied, setCopied] = useState<string|null>(null)
  const [changingPlan, setChangingPlan] = useState<string|null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/users')
      if (res.status === 403) { setError('Brak dostępu — ustaw is_admin = true w tabeli profiles'); return }
      const j = await res.json()
      setUsers(j.users || []); setInvites(j.invites || [])
    } catch { setError('Błąd ładowania') }
    finally { setLoading(false) }
  }

  async function createInvite() {
    setInvLoading(true); setNewInviteUrl('')
    try {
      const res = await fetch('/api/admin/invite', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email:invEmail, plan:invPlan, note:invNote })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setNewInviteUrl(j.url)
      setInvEmail(''); setInvNote('')
      loadData()
    } catch(e:unknown) { alert(e instanceof Error ? e.message : 'Błąd') }
    finally { setInvLoading(false) }
  }

  async function updatePlan(userId: string, plan: string) {
    setChangingPlan(userId)
    await fetch('/api/admin/update-plan', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId, plan })
    })
    setUsers(prev => prev.map(u => u.id===userId ? {...u, profile:{...u.profile,plan}} : u))
    setChangingPlan(null)
  }

  async function savePermissions(userId: string, permissions: Permissions) {
    await fetch('/api/admin/permissions', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId, permissions })
    })
    setUsers(prev => prev.map(u => u.id===userId ? {...u, permissions} : u))
  }

  async function toggleAdmin(userId: string, current: boolean) {
    await fetch('/api/admin/update-plan', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId, is_admin: !current })
    })
    setUsers(prev => prev.map(u => u.id===userId ? {...u, profile:{...u.profile,is_admin:!current}} : u))
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(()=>setCopied(null), 1500)
  }

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: users.length,
    free: users.filter(u=>!u.profile?.plan||u.profile.plan==='free').length,
    pro: users.filter(u=>u.profile?.plan==='pro').length,
    agency: users.filter(u=>u.profile?.plan==='agency').length,
    activeInvites: invites.filter(i=>!i.used_at && new Date(i.expires_at)>new Date()).length,
  }

  if (loading) return <AppShell><div className="px-8 py-8 text-gray-500 text-sm">Ładowanie...</div></AppShell>

  if (error) return (
    <AppShell><div className="px-8 py-8 max-w-2xl">
      <div className="rounded-2xl px-6 py-5" style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)'}}>
        <p className="text-red-300 font-semibold mb-1">Brak dostępu do panelu admina</p>
        <p className="text-sm text-gray-400 mb-3">{error}</p>
        <div className="p-3 rounded-xl font-mono text-xs text-emerald-300"
          style={{background:'rgba(0,0,0,0.3)'}}>
          update public.profiles set is_admin = true where email = &apos;twoj@email.com&apos;;
        </div>
        <p className="text-xs text-gray-600 mt-2">Uruchom w Supabase SQL Editor</p>
      </div>
    </div></AppShell>
  )

  return (
    <AppShell>
      {editingUser && (
        <PermissionsModal
          user={editingUser}
          onSave={savePermissions}
          onClose={() => setEditingUser(null)}
        />
      )}

      <div className="px-8 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">⚙️ Panel Admina</h1>
            <p className="text-gray-500 text-sm mt-1">Zarządzaj użytkownikami, uprawnieniami i zaproszeniami</p>
          </div>
          <button onClick={loadData} className="btn-secondary text-sm">↻ Odśwież</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            {label:'Wszyscy',value:stats.total,color:'text-white'},
            {label:'Free',value:stats.free,color:'text-gray-400'},
            {label:'Pro',value:stats.pro,color:'text-indigo-400'},
            {label:'Agency',value:stats.agency,color:'text-amber-400'},
            {label:'Aktywne zaproszenia',value:stats.activeInvites,color:'text-emerald-400'},
          ].map(s=>(
            <div key={s.label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-600 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-5"
          style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
          {[
            {id:'users',label:`👥 Użytkownicy (${users.length})`},
            {id:'invites',label:`✉️ Zaproszenia (${invites.length})`},
          ].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id as typeof activeTab)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{background:activeTab===t.id?'rgba(99,102,241,0.25)':'transparent',color:activeTab===t.id?'#a5b4fc':'#6b7280'}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── USERS ── */}
        {activeTab==='users' && (
          <div>
            <input className="input mb-4" placeholder="Szukaj po emailu..."
              value={search} onChange={e=>setSearch(e.target.value)}/>
            <div className="space-y-2">
              {filtered.map(u => {
                const perms = u.permissions
                const enabledModules = perms ? MODULE_LIST.filter(m=>perms[m.key as keyof Permissions]).length : null
                return (
                  <div key={u.id} className="card">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{background:'linear-gradient(135deg,rgba(99,102,241,0.4),rgba(168,85,247,0.3))'}}>
                        {(u.profile?.full_name||u.email||'?')[0].toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-white">{u.email}</p>
                          <PlanBadge plan={u.profile?.plan||'free'}/>
                          {u.profile?.is_admin && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                              style={{background:'rgba(251,191,36,0.2)',color:'#fbbf24'}}>ADMIN</span>
                          )}
                          {u.profile?.onboarded && <span className="text-[10px] text-emerald-500">✓ onboarded</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] text-gray-600">{u.provider}</span>
                          <span className="text-[11px] text-gray-600">{u.projects} proj.</span>
                          <span className="text-[11px] text-gray-600">{u.monthly_drafts} postów/mies.</span>
                          {enabledModules !== null && (
                            <span className="text-[11px] text-indigo-400">{enabledModules}/{MODULE_LIST.length} modułów</span>
                          )}
                          <span className="text-[11px] text-gray-700">
                            ostatnio {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString('pl') : 'nigdy'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Plan selector */}
                        <select
                          className="text-xs rounded-lg px-2 py-1.5 border"
                          style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(255,255,255,0.1)',color:'#9ca3af'}}
                          value={u.profile?.plan||'free'}
                          onChange={e=>updatePlan(u.id,e.target.value)}
                          disabled={changingPlan===u.id}>
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="agency">Agency</option>
                        </select>

                        {/* Permissions button */}
                        <button onClick={()=>setEditingUser(u)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all"
                          style={{
                            background: perms ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                            borderColor: perms ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
                            color: perms ? '#a5b4fc' : '#6b7280',
                          }}>
                          🔐 {perms ? 'Edytuj' : 'Uprawnienia'}
                        </button>

                        {/* Admin toggle */}
                        <button onClick={()=>toggleAdmin(u.id,!!u.profile?.is_admin)}
                          className="text-[11px] px-2.5 py-1.5 rounded-xl border transition-all"
                          style={{
                            background: u.profile?.is_admin?'rgba(251,191,36,0.2)':'rgba(255,255,255,0.04)',
                            borderColor: u.profile?.is_admin?'rgba(251,191,36,0.4)':'rgba(255,255,255,0.08)',
                            color: u.profile?.is_admin?'#fbbf24':'#6b7280',
                          }}>
                          {u.profile?.is_admin?'★ Admin':'Admin'}
                        </button>
                      </div>
                    </div>

                    {/* Permissions preview */}
                    {perms && (
                      <div className="mt-3 pt-3 flex flex-wrap gap-1.5"
                        style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                        {MODULE_LIST.map(m => (
                          <span key={m.key}
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{
                              background: perms[m.key as keyof Permissions] ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                              color: perms[m.key as keyof Permissions] ? '#a5b4fc' : '#374151',
                              border: `1px solid ${perms[m.key as keyof Permissions] ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'}`,
                              textDecoration: perms[m.key as keyof Permissions] ? 'none' : 'line-through',
                            }}>
                            {m.label}
                          </span>
                        ))}
                        <span className="text-[10px] text-gray-600 ml-1">
                          max {perms.max_projects} proj · {perms.max_posts_per_month} postów/mies
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── INVITES ── */}
        {activeTab==='invites' && (
          <div className="space-y-5">
            {/* Create */}
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-white">Wyślij zaproszenie</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Email (opcjonalnie)</label>
                  <input className="input" placeholder="user@firma.pl"
                    value={invEmail} onChange={e=>setInvEmail(e.target.value)}/>
                </div>
                <div>
                  <label className="label">Plan startowy</label>
                  <select className="input" value={invPlan} onChange={e=>setInvPlan(e.target.value)}>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="agency">Agency</option>
                  </select>
                </div>
                <div>
                  <label className="label">Notatka (dla Ciebie)</label>
                  <input className="input" placeholder="np. klient Kids&Co"
                    value={invNote} onChange={e=>setInvNote(e.target.value)}/>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={createInvite} disabled={invLoading} className="btn-primary flex items-center gap-2">
                  {invLoading ? '...' : '✉️ Generuj link zaproszenia'}
                </button>
                <p className="text-xs text-gray-600">Link ważny 7 dni · jednorazowy</p>
              </div>

              {newInviteUrl && (
                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)'}}>
                  <p className="text-xs font-mono text-emerald-300 flex-1 break-all">{newInviteUrl}</p>
                  <button onClick={()=>copy(newInviteUrl,'url')}
                    className="text-xs px-3 py-1.5 rounded-lg shrink-0 font-semibold"
                    style={{background:'rgba(16,185,129,0.2)',color:'#34d399',border:'1px solid rgba(16,185,129,0.3)'}}>
                    {copied==='url'?'✓ Skopiowano':'Kopiuj'}
                  </button>
                </div>
              )}
            </div>

            {/* List */}
            <div className="space-y-2">
              {invites.length===0 && (
                <div className="card text-center py-8 text-gray-600">Brak wysłanych zaproszeń</div>
              )}
              {invites.map(inv => {
                const used = !!inv.used_at
                const expired = !used && new Date(inv.expires_at)<new Date()
                const active = !used && !expired
                const invUrl = typeof window !== 'undefined' ? `${window.location.origin}/invite/${inv.token}` : ''
                return (
                  <div key={inv.id} className="card flex items-center gap-4"
                    style={{opacity:used||expired?0.55:1}}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{background:used?'#6b7280':expired?'#f87171':'#34d399'}}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm text-gray-200">{inv.email||'Bez emaila'}</p>
                        <PlanBadge plan={inv.plan}/>
                        {inv.note && <span className="text-xs text-gray-600">· {inv.note}</span>}
                      </div>
                      <p className="text-[11px] font-mono text-gray-700 truncate">{invUrl}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold"
                        style={{color:used?'#6b7280':expired?'#f87171':'#34d399'}}>
                        {used?'Użyte':expired?'Wygasłe':'Aktywne'}
                      </p>
                      <p className="text-[10px] text-gray-600">
                        {used?`użyte ${new Date(inv.used_at!).toLocaleDateString('pl')}`:
                          `wygasa ${new Date(inv.expires_at).toLocaleDateString('pl')}`}
                      </p>
                    </div>
                    {active && (
                      <button onClick={()=>copy(invUrl,inv.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg shrink-0"
                        style={{background:'rgba(99,102,241,0.15)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.25)'}}>
                        {copied===inv.id?'✓':'Kopiuj link'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
