'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/layout/AppShell'

// ─── Types ────────────────────────────────────────────────────
interface Permissions {
  // Główne
  can_strategia: boolean
  can_rtm: boolean
  can_asystent: boolean
  can_briefy: boolean
  can_wlasny_brief: boolean
  can_grafika: boolean
  can_prezentacja: boolean
  can_generate_posts: boolean
  // Praca codzienna
  can_biblioteka: boolean
  can_scheduler: boolean
  can_kalendarz: boolean
  can_analityka: boolean
  can_raport: boolean
  // Marka
  can_marka: boolean
  can_brand_dna: boolean
  can_platformy: boolean
  can_materialy: boolean
  can_stworzone: boolean
  can_news: boolean
  can_projekty: boolean
  can_wiadomosci: boolean
  // AI Tools
  can_copywriter: boolean
  can_content_score: boolean
  can_kampania: boolean
  can_persona: boolean
  can_listening: boolean
  can_wideo: boolean
  can_trendy: boolean
  can_competitor: boolean
  can_repurposing: boolean
  can_ab_testy: boolean
  // Specjaliści AI
  can_meta_ads: boolean
  can_performance: boolean
  can_storyboard: boolean
  can_crisis: boolean
  can_voice_checker: boolean
  can_newsletter: boolean
  can_caption_ab: boolean
  can_eventy: boolean
  // Limits
  max_projects: number
  max_posts_per_month: number
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
interface ActivityLogEntry {
  id: string
  user_id: string
  user_email?: string
  action: string
  details?: string
  metadata?: Record<string, unknown>
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────
const PLAN_CFG: Record<string,{color:string;bg:string;border:string}> = {
  free:   {color:'#9ca3af',bg:'rgba(156,163,175,0.1)',border:'rgba(156,163,175,0.2)'},
  pro:    {color:'#a5b4fc',bg:'rgba(99,102,241,0.15)',border:'rgba(99,102,241,0.3)'},
  agency: {color:'#fbbf24',bg:'rgba(251,191,36,0.15)',border:'rgba(251,191,36,0.3)'},
}

interface ModuleDef { key: keyof Permissions; label: string; icon: string }
interface ModuleGroup { label: string; items: ModuleDef[] }

const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: 'Główne',
    items: [
      { key:'can_strategia',      label:'Strategia',           icon:'🧭' },
      { key:'can_rtm',            label:'RTM Generator',       icon:'⚡' },
      { key:'can_asystent',       label:'Asystent AI',         icon:'🤖' },
      { key:'can_briefy',         label:'Briefy klientów',     icon:'📋' },
      { key:'can_wlasny_brief',   label:'Własny brief',        icon:'📂' },
      { key:'can_grafika',        label:'Stwórz grafikę',      icon:'🖼️' },
      { key:'can_prezentacja',    label:'Prezentacja',         icon:'🎤' },
      { key:'can_generate_posts', label:'Generuj posty',       icon:'✦' },
    ],
  },
  {
    label: 'Praca codzienna',
    items: [
      { key:'can_biblioteka', label:'Biblioteka', icon:'📚' },
      { key:'can_scheduler',  label:'Scheduler',  icon:'📅' },
      { key:'can_kalendarz',  label:'Kalendarz',  icon:'⊟' },
      { key:'can_analityka',  label:'Analityka',  icon:'⊘' },
      { key:'can_raport',     label:'Raport',     icon:'📈' },
    ],
  },
  {
    label: 'Marka',
    items: [
      { key:'can_marka',      label:'Marka',          icon:'◈' },
      { key:'can_brand_dna',  label:'Brand DNA',      icon:'◉' },
      { key:'can_platformy',  label:'Platformy',      icon:'⊹' },
      { key:'can_materialy',  label:'Materiały',      icon:'⊡' },
      { key:'can_stworzone',  label:'Stworzone',      icon:'📦' },
      { key:'can_news',       label:'Newsy branżowe', icon:'📰' },
      { key:'can_projekty',   label:'Projekty',       icon:'🗂' },
      { key:'can_wiadomosci', label:'Wiadomości',     icon:'📬' },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { key:'can_copywriter',    label:'AI Copywriter',       icon:'✍️' },
      { key:'can_content_score', label:'Content Score',       icon:'📊' },
      { key:'can_kampania',      label:'Kampania 360°',       icon:'🚀' },
      { key:'can_persona',       label:'Persona Builder',     icon:'👤' },
      { key:'can_listening',     label:'Social Listening',    icon:'📡' },
      { key:'can_wideo',         label:'Skrypty wideo',       icon:'🎬' },
      { key:'can_trendy',        label:'Trendy',              icon:'📡' },
      { key:'can_competitor',    label:'Konkurencja',         icon:'🔍' },
      { key:'can_repurposing',   label:'Smart Repurposing',   icon:'♻️' },
      { key:'can_ab_testy',      label:'Testy A/B',           icon:'🧪' },
    ],
  },
  {
    label: 'Specjaliści AI',
    items: [
      { key:'can_meta_ads',      label:'Meta Ads',            icon:'📣' },
      { key:'can_performance',   label:'Brief Performance',   icon:'⚡' },
      { key:'can_storyboard',    label:'Storyboard',          icon:'🎬' },
      { key:'can_crisis',        label:'Crisis Response',     icon:'🚨' },
      { key:'can_voice_checker', label:'Voice Checker',       icon:'🎯' },
      { key:'can_newsletter',    label:'Newsletter',          icon:'📧' },
      { key:'can_caption_ab',    label:'Caption A/B',         icon:'🧪' },
      { key:'can_eventy',        label:'Eventy',              icon:'🎪' },
    ],
  },
]

// Flat list for counting + iteration
const MODULE_LIST: ModuleDef[] = MODULE_GROUPS.flatMap(g => g.items)

// Helper to build preset with all modules either on or off
function buildPreset(enabledKeys: Array<keyof Permissions>, max_projects: number, max_posts_per_month: number): Partial<Permissions> {
  const result: Partial<Permissions> = { max_projects, max_posts_per_month }
  for (const m of MODULE_LIST) {
    (result as Record<string, boolean>)[m.key as string] = enabledKeys.includes(m.key)
  }
  return result
}

// Free: tylko podstawy
const FREE_KEYS: Array<keyof Permissions> = [
  'can_generate_posts', 'can_biblioteka', 'can_scheduler', 'can_kalendarz',
  'can_marka', 'can_brand_dna', 'can_platformy', 'can_projekty', 'can_wiadomosci',
  'can_trendy', 'can_news', 'can_asystent',
]

// Pro: wszystko bez bardzo zaawansowanych
const PRO_KEYS: Array<keyof Permissions> = [
  ...FREE_KEYS,
  'can_strategia', 'can_rtm', 'can_briefy', 'can_wlasny_brief', 'can_grafika',
  'can_prezentacja', 'can_analityka', 'can_raport', 'can_materialy', 'can_stworzone',
  'can_copywriter', 'can_content_score', 'can_kampania', 'can_persona',
  'can_competitor', 'can_repurposing', 'can_ab_testy', 'can_wideo',
  'can_meta_ads', 'can_storyboard', 'can_voice_checker', 'can_newsletter', 'can_caption_ab',
  'can_eventy',
]

// Agency: wszystko
const AGENCY_KEYS: Array<keyof Permissions> = MODULE_LIST.map(m => m.key)

const PLAN_PRESETS: Record<string, Partial<Permissions>> = {
  free:   buildPreset(FREE_KEYS, 1, 10),
  pro:    buildPreset(PRO_KEYS, 10, 200),
  agency: buildPreset(AGENCY_KEYS, 999, 9999),
}

const DEFAULT_PERMS: Permissions = {
  ...buildPreset(PRO_KEYS, 3, 50),
} as Permissions

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
      <div className="w-full max-w-3xl rounded-2xl overflow-hidden"
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

        <div className="px-6 py-4 space-y-5 max-h-[75vh] overflow-y-auto">
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

          {/* Module toggles - grouped */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dostęp do modułów</p>
              <span className="text-xs text-gray-600">{enabledCount}/{MODULE_LIST.length} aktywnych</span>
            </div>

            <div className="space-y-4">
              {MODULE_GROUPS.map(group => {
                const groupEnabled = group.items.filter(m => perms[m.key]).length
                const allOn = groupEnabled === group.items.length
                const allOff = groupEnabled === 0
                return (
                  <div key={group.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300/70">
                        {group.label}
                        <span className="ml-2 text-gray-600 normal-case font-normal">{groupEnabled}/{group.items.length}</span>
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setPerms(prev => {
                            const next = { ...prev }
                            for (const m of group.items) (next as Record<string, boolean | number>)[m.key as string] = true
                            setActivePreset(null)
                            return next
                          })}
                          disabled={allOn}
                          className="text-[10px] px-2 py-0.5 rounded transition-all disabled:opacity-30"
                          style={{background:'rgba(99,102,241,0.15)',color:'#a5b4fc'}}>Wszystko</button>
                        <button
                          onClick={() => setPerms(prev => {
                            const next = { ...prev }
                            for (const m of group.items) (next as Record<string, boolean | number>)[m.key as string] = false
                            setActivePreset(null)
                            return next
                          })}
                          disabled={allOff}
                          className="text-[10px] px-2 py-0.5 rounded transition-all disabled:opacity-30"
                          style={{background:'rgba(255,255,255,0.04)',color:'#6b7280'}}>Nic</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.items.map(m => {
                        const enabled = !!perms[m.key]
                        return (
                          <button key={m.key} onClick={() => toggle(m.key)}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all"
                            style={{
                              background: enabled ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${enabled ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)'}`,
                            }}>
                            <span className="text-sm w-5 text-center flex-shrink-0">{m.icon}</span>
                            <span className={`flex-1 text-xs text-left truncate ${enabled?'text-gray-200':'text-gray-600'}`}>{m.label}</span>
                            <div className={`w-7 h-4 rounded-full transition-all relative flex-shrink-0 ${enabled?'bg-indigo-500':'bg-gray-800'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${enabled?'left-[14px]':'left-0.5'}`}/>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
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
// ─── Chat Modal ─────────────────────────────────
interface ChatMessage {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read_at: string | null
  created_at: string
}

function ChatModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    
    async function load() {
      // Get my ID first
      const supabase = (await import('@/lib/supabase')).createClient()
      const { data: { user: me } } = await supabase.auth.getUser()
      if (!cancelled && me) setCurrentUserId(me.id)
      
      const res = await fetch(`/api/admin/chat?with=${user.id}`)
      const j = await res.json()
      if (!cancelled && j.ok) {
        setMessages(j.messages)
        setLoading(false)
      }
    }
    load()

    // Poll for new messages every 5s while modal open
    const interval = setInterval(load, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [user.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: user.id, content: input.trim() })
      })
      const j = await res.json()
      if (j.ok && j.message) {
        setMessages(prev => [...prev, j.message])
        setInput('')
      }
    } finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70" onClick={onClose}>
      <div className="rounded-2xl w-full max-w-2xl flex flex-col"
        style={{ background: '#0f1423', border: '1px solid rgba(255,255,255,0.1)', height: '600px' }}
        onClick={e => e.stopPropagation()}>
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <p className="text-xs text-indigo-400 font-medium mb-0.5">💬 Wiadomość do użytkownika</p>
            <h2 className="text-lg font-semibold text-white">{user.email}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl w-8 h-8 flex items-center justify-center">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-8">Ładowanie...</p>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-sm text-gray-400">Brak wiadomości</p>
              <p className="text-xs text-gray-600 mt-1">Napisz pierwszą wiadomość poniżej</p>
            </div>
          ) : (
            messages.map(m => {
              const isMine = m.sender_id === currentUserId
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[70%] rounded-2xl px-4 py-2.5"
                    style={{
                      background: isMine ? '#6366f1' : 'rgba(255,255,255,0.06)',
                      border: isMine ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-white">{m.content}</p>
                    <p className="text-[10px] mt-1" style={{ color: isMine ? 'rgba(255,255,255,0.7)' : '#6b7280' }}>
                      {new Date(m.created_at).toLocaleString('pl', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {isMine && m.read_at && ' · ✓✓'}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef}/>
        </div>

        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex gap-2">
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Napisz wiadomość..."
              rows={1}
              className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500 outline-none resize-none"
              style={{ minHeight: 44, maxHeight: 120 }} />
            <button onClick={send} disabled={sending || !input.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-30"
              style={{ background: '#6366f1', color: 'white' }}>
              {sending ? '...' : 'Wyślij'}
            </button>
          </div>
          <p className="text-[10px] text-gray-600 mt-2">Enter = wyślij · Shift+Enter = nowa linia</p>
        </div>
      </div>
    </div>
  )
}

// ─── Admin Page ─────────────────────────────────
export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'users'|'invites'|'activity'>('users')
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState<UserRow|null>(null)
  const [chatUser, setChatUser] = useState<UserRow|null>(null)
  const [deletingUser, setDeletingUser] = useState<string|null>(null)

  // New filters
  const [planFilter, setPlanFilter] = useState<'all'|'free'|'pro'|'agency'>('all')
  const [activityFilter, setActivityFilter] = useState<'all'|'today'|'week'|'month'|'inactive'>('all')
  const [sortBy, setSortBy] = useState<'newest'|'oldest'|'active'|'projects'|'drafts'>('newest')

  // Bulk operations
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<string>('')
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // Activity log
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [activityFilterUser, setActivityFilterUser] = useState<string>('')
  const [activityFilterAction, setActivityFilterAction] = useState<string>('')

  // Invite form
  const [invEmail, setInvEmail] = useState('')
  const [invPlan, setInvPlan] = useState('pro')
  const [invNote, setInvNote] = useState('')
  const [invLoading, setInvLoading] = useState(false)
  const [newInviteUrl, setNewInviteUrl] = useState('')
  const [copied, setCopied] = useState<string|null>(null)
  const [changingPlan, setChangingPlan] = useState<string|null>(null)
  const [invFilter, setInvFilter] = useState<'all'|'active'|'used'|'expired'>('all')

  async function manageInvite(id: string, action: 'cancel'|'extend'|'delete') {
    if (action === 'delete') {
      if (!confirm('Usunąć zaproszenie?')) return
      await fetch(`/api/admin/invite/${id}`, { method: 'DELETE' })
      setInvites(prev => prev.filter(i => i.id !== id))
    } else {
      await fetch(`/api/admin/invite/${id}`, {
        method: 'PATCH', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action })
      })
      loadData()
    }
  }

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

  async function deleteUser(u: UserRow) {
    if (!confirm(`Czy na pewno chcesz usunąć użytkownika ${u.email}?\n\nTa operacja jest nieodwracalna i usunie wszystkie dane użytkownika (projekty, posty, materiały itp.).`)) return
    setDeletingUser(u.id)
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id })
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setUsers(prev => prev.filter(x => x.id !== u.id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setDeletingUser(null)
    }
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

  async function runBulkAction() {
    if (!bulkAction || selectedUsers.size === 0) return
    const ids = Array.from(selectedUsers)

    if (bulkAction === 'delete') {
      if (!confirm(`Usunąć ${ids.length} użytkowników? Operacja jest nieodwracalna.`)) return
    }

    setBulkProcessing(true)
    try {
      if (bulkAction.startsWith('plan:')) {
        const plan = bulkAction.split(':')[1]
        await Promise.all(ids.map(id =>
          fetch('/api/admin/update-plan', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ userId: id, plan })
          })
        ))
        setUsers(prev => prev.map(u => ids.includes(u.id) ? {...u, profile:{...u.profile,plan}} : u))
      } else if (bulkAction.startsWith('preset:')) {
        const presetKey = bulkAction.split(':')[1]
        const preset = PLAN_PRESETS[presetKey]
        if (!preset) return
        const fullPerms = { ...DEFAULT_PERMS, ...preset } as Permissions
        await Promise.all(ids.map(id =>
          fetch('/api/admin/permissions', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ userId: id, permissions: fullPerms })
          })
        ))
        setUsers(prev => prev.map(u => ids.includes(u.id) ? {...u, permissions: fullPerms} : u))
      } else if (bulkAction === 'delete') {
        await Promise.all(ids.map(id =>
          fetch(`/api/admin/users?id=${id}`, { method:'DELETE' })
        ))
        setUsers(prev => prev.filter(u => !ids.includes(u.id)))
      }
      setSelectedUsers(new Set())
      setBulkAction('')
    } catch (e) {
      alert('Błąd podczas operacji bulk: ' + (e instanceof Error ? e.message : 'unknown'))
    } finally {
      setBulkProcessing(false)
    }
  }

  async function loadActivityLog() {
    try {
      const res = await fetch('/api/admin/activity-log')
      if (!res.ok) return
      const json = await res.json()
      setActivityLog(json.entries || [])
    } catch (e) {
      console.error('activity log load failed:', e)
    }
  }

  // Load activity log when tab is active
  useEffect(() => {
    if (activeTab === 'activity') loadActivityLog()
  }, [activeTab])

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(()=>setCopied(null), 1500)
  }

  // ── Filters: plan + sort + activity status ──
  const filtered = users.filter(u => {
    // Search
    if (search) {
      const s = search.toLowerCase()
      const matchEmail = u.email?.toLowerCase().includes(s)
      const matchName = u.profile?.full_name?.toLowerCase().includes(s)
      if (!matchEmail && !matchName) return false
    }
    // Plan filter
    if (planFilter !== 'all') {
      const userPlan = u.profile?.plan || 'free'
      if (planFilter !== userPlan) return false
    }
    // Activity filter
    if (activityFilter !== 'all') {
      const last = u.last_sign_in ? new Date(u.last_sign_in).getTime() : 0
      const now = Date.now()
      const day = 86400000
      if (activityFilter === 'today' && now - last > day) return false
      if (activityFilter === 'week' && now - last > 7*day) return false
      if (activityFilter === 'month' && now - last > 30*day) return false
      if (activityFilter === 'inactive' && now - last <= 30*day) return false
    }
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'active': {
        const la = a.last_sign_in ? new Date(a.last_sign_in).getTime() : 0
        const lb = b.last_sign_in ? new Date(b.last_sign_in).getTime() : 0
        return lb - la
      }
      case 'projects': return (b.projects||0) - (a.projects||0)
      case 'drafts': return (b.monthly_drafts||0) - (a.monthly_drafts||0)
      default: return 0
    }
  })

  // ── Stats ──
  const now = Date.now()
  const day = 86400000
  const stats = {
    total: users.length,
    free: users.filter(u=>!u.profile?.plan||u.profile.plan==='free').length,
    pro: users.filter(u=>u.profile?.plan==='pro').length,
    agency: users.filter(u=>u.profile?.plan==='agency').length,
    activeInvites: invites.filter(i=>!i.used_at && new Date(i.expires_at)>new Date()).length,
    activeToday: users.filter(u => u.last_sign_in && now - new Date(u.last_sign_in).getTime() <= day).length,
    activeWeek: users.filter(u => u.last_sign_in && now - new Date(u.last_sign_in).getTime() <= 7*day).length,
    activeMonth: users.filter(u => u.last_sign_in && now - new Date(u.last_sign_in).getTime() <= 30*day).length,
    inactive: users.filter(u => !u.last_sign_in || now - new Date(u.last_sign_in).getTime() > 30*day).length,
    totalProjects: users.reduce((sum, u) => sum + (u.projects||0), 0),
    totalMonthlyDrafts: users.reduce((sum, u) => sum + (u.monthly_drafts||0), 0),
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

      {chatUser && (
        <ChatModal user={chatUser} onClose={() => setChatUser(null)} />
      )}

      <div className="px-8 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">⚙️ Panel Admina</h1>
            <p className="text-gray-500 text-sm mt-1">Zarządzaj użytkownikami, uprawnieniami i zaproszeniami</p>
          </div>
          <button onClick={loadData} className="btn-secondary text-sm">↻ Odśwież</button>
        </div>

        {/* Stats - 2 rows */}
        <div className="grid grid-cols-5 gap-3 mb-3">
          {[
            {label:'Wszyscy',value:stats.total,color:'text-white',sub:`${stats.totalProjects} projektów`},
            {label:'Free',value:stats.free,color:'text-gray-400',sub:`${Math.round(stats.free/Math.max(stats.total,1)*100)}%`},
            {label:'Pro',value:stats.pro,color:'text-indigo-400',sub:`${Math.round(stats.pro/Math.max(stats.total,1)*100)}%`},
            {label:'Agency',value:stats.agency,color:'text-amber-400',sub:`${Math.round(stats.agency/Math.max(stats.total,1)*100)}%`},
            {label:'Aktywne zaproszenia',value:stats.activeInvites,color:'text-emerald-400',sub:'oczekują'},
          ].map(s=>(
            <div key={s.label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-600 mt-1">{s.label}</p>
              {s.sub && <p className="text-[9px] text-gray-700 mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            {label:'Aktywni dziś',value:stats.activeToday,color:'text-emerald-300',sub:'<24h'},
            {label:'Aktywni 7 dni',value:stats.activeWeek,color:'text-emerald-400',sub:'tydzień'},
            {label:'Aktywni 30 dni',value:stats.activeMonth,color:'text-blue-400',sub:'miesiąc'},
            {label:'Nieaktywni',value:stats.inactive,color:'text-gray-500',sub:'30+ dni'},
            {label:'Posty (m-c)',value:stats.totalMonthlyDrafts,color:'text-purple-400',sub:'wszyscy łącznie'},
          ].map(s=>(
            <div key={s.label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-600 mt-1">{s.label}</p>
              {s.sub && <p className="text-[9px] text-gray-700 mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-5"
          style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
          {[
            {id:'users',label:`👥 Użytkownicy (${users.length})`},
            {id:'invites',label:`✉️ Zaproszenia (${invites.length})`},
            {id:'activity',label:`📊 Activity log`},
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
            {/* Search + Filters */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <input className="input flex-1 min-w-[240px]" placeholder="🔍 Szukaj po emailu lub imieniu..."
                value={search} onChange={e=>setSearch(e.target.value)}/>
              <select className="input w-auto" value={planFilter} onChange={e=>setPlanFilter(e.target.value as typeof planFilter)}>
                <option value="all">Wszystkie plany</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="agency">Agency</option>
              </select>
              <select className="input w-auto" value={activityFilter} onChange={e=>setActivityFilter(e.target.value as typeof activityFilter)}>
                <option value="all">Aktywność</option>
                <option value="today">Aktywni dziś</option>
                <option value="week">Ostatnie 7 dni</option>
                <option value="month">Ostatnie 30 dni</option>
                <option value="inactive">Nieaktywni 30+ dni</option>
              </select>
              <select className="input w-auto" value={sortBy} onChange={e=>setSortBy(e.target.value as typeof sortBy)}>
                <option value="newest">Sortuj: Najnowsi</option>
                <option value="oldest">Sortuj: Najstarsi</option>
                <option value="active">Sortuj: Ostatnio aktywni</option>
                <option value="projects">Sortuj: Liczba projektów</option>
                <option value="drafts">Sortuj: Posty / mies.</option>
              </select>
            </div>

            {/* Result count + clear filters */}
            <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
              <span>Pokazano {sorted.length} z {users.length} {sorted.length===users.length?'':'(po filtrowaniu)'}</span>
              {(search || planFilter!=='all' || activityFilter!=='all' || sortBy!=='newest') && (
                <button onClick={()=>{setSearch('');setPlanFilter('all');setActivityFilter('all');setSortBy('newest')}}
                  className="text-indigo-400 hover:text-indigo-300">✕ Wyczyść filtry</button>
              )}
            </div>

            {/* Bulk actions bar */}
            {selectedUsers.size > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 mb-3 rounded-xl"
                style={{background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.3)'}}>
                <span className="text-sm font-medium text-white">
                  Zaznaczono <span className="text-indigo-300">{selectedUsers.size}</span> {selectedUsers.size===1?'użytkownika':'użytkowników'}
                </span>
                <select
                  className="text-xs rounded-lg px-2 py-1.5"
                  style={{background:'rgba(255,255,255,0.08)',color:'#e5e7eb',border:'1px solid rgba(255,255,255,0.15)'}}
                  value={bulkAction} onChange={e=>setBulkAction(e.target.value)}>
                  <option value="">— Wybierz akcję —</option>
                  <option value="plan:free">Zmień plan na Free</option>
                  <option value="plan:pro">Zmień plan na Pro</option>
                  <option value="plan:agency">Zmień plan na Agency</option>
                  <option value="preset:free">Zastosuj uprawnienia Free</option>
                  <option value="preset:pro">Zastosuj uprawnienia Pro</option>
                  <option value="preset:agency">Zastosuj uprawnienia Agency</option>
                  <option value="delete">🗑 Usuń użytkowników</option>
                </select>
                <button
                  onClick={runBulkAction}
                  disabled={!bulkAction || bulkProcessing}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30"
                  style={{background:bulkAction==='delete'?'#ef4444':'#6366f1',color:'white'}}>
                  {bulkProcessing ? 'Wykonuję...' : 'Wykonaj'}
                </button>
                <button onClick={()=>setSelectedUsers(new Set())}
                  className="text-xs text-gray-400 hover:text-gray-300 ml-auto">Anuluj zaznaczenie</button>
              </div>
            )}

            {/* Select all */}
            {sorted.length > 0 && (
              <div className="flex items-center gap-2 mb-2 px-2">
                <input type="checkbox"
                  checked={sorted.every(u => selectedUsers.has(u.id))}
                  onChange={e => {
                    if (e.target.checked) setSelectedUsers(new Set(sorted.map(u => u.id)))
                    else setSelectedUsers(new Set())
                  }}
                  className="w-4 h-4 rounded accent-indigo-500"/>
                <span className="text-xs text-gray-500">
                  {sorted.every(u => selectedUsers.has(u.id)) ? 'Odznacz wszystkich' : 'Zaznacz wszystkich na liście'}
                </span>
              </div>
            )}

            <div className="space-y-2">
              {sorted.map(u => {
                const perms = u.permissions
                const enabledModules = perms ? MODULE_LIST.filter(m=>perms[m.key as keyof Permissions]).length : null
                const isSelected = selectedUsers.has(u.id)
                return (
                  <div key={u.id} className="card" style={isSelected ? {borderColor:'rgba(99,102,241,0.5)',background:'rgba(99,102,241,0.03)'} : undefined}>
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <input type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedUsers(prev => {
                            const next = new Set(prev)
                            if (next.has(u.id)) next.delete(u.id)
                            else next.add(u.id)
                            return next
                          })
                        }}
                        className="w-4 h-4 rounded accent-indigo-500 shrink-0"/>

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

                        {/* Chat */}
                        <button onClick={() => setChatUser(u)}
                          title="Wyślij wiadomość"
                          className="text-xs px-2.5 py-1.5 rounded-xl border transition-all"
                          style={{
                            background: 'rgba(99,102,241,0.08)',
                            borderColor: 'rgba(99,102,241,0.25)',
                            color: '#a5b4fc',
                          }}>
                          💬
                        </button>

                        {/* Delete */}
                        <button onClick={() => deleteUser(u)}
                          title="Usuń użytkownika"
                          className="text-xs px-2.5 py-1.5 rounded-xl border transition-all"
                          style={{
                            background: 'rgba(239,68,68,0.08)',
                            borderColor: 'rgba(239,68,68,0.25)',
                            color: '#fca5a5',
                          }}>
                          🗑
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

            {/* Filters */}
            <div className="flex gap-2 mb-3">
              {(['all','active','used','expired'] as const).map(f => (
                <button key={f} onClick={() => setInvFilter(f)}
                  className="text-xs px-3 py-1.5 rounded-xl border transition-all"
                  style={{
                    background: invFilter===f ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                    borderColor: invFilter===f ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)',
                    color: invFilter===f ? '#a5b4fc' : '#6b7280',
                  }}>
                  {f==='all'?`Wszystkie (${invites.length})`:
                   f==='active'?`Aktywne (${invites.filter(i=>!i.used_at&&new Date(i.expires_at)>new Date()).length})`:
                   f==='used'?`Użyte (${invites.filter(i=>!!i.used_at).length})`:
                   `Wygasłe (${invites.filter(i=>!i.used_at&&new Date(i.expires_at)<=new Date()).length})`}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-2">
              {invites.length===0 && (
                <div className="card text-center py-8 text-gray-600">Brak wysłanych zaproszeń</div>
              )}
              {invites
                .filter(inv => {
                  const used = !!inv.used_at
                  const expired = !used && new Date(inv.expires_at)<=new Date()
                  const active = !used && !expired
                  if (invFilter==='active') return active
                  if (invFilter==='used') return used
                  if (invFilter==='expired') return expired
                  return true
                })
                .map(inv => {
                const used = !!inv.used_at
                const expired = !used && new Date(inv.expires_at)<=new Date()
                const active = !used && !expired
                const invUrl = typeof window !== 'undefined' ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/invite/${inv.token}` : ''
                return (
                  <div key={inv.id} className="card"
                    style={{opacity:used?0.6:1}}>
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                        style={{background:used?'#6b7280':expired?'#f87171':'#34d399'}}/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm text-gray-200">{inv.email||'Bez emaila'}</p>
                          <PlanBadge plan={inv.plan}/>
                          {inv.note && <span className="text-xs text-gray-600">· {inv.note}</span>}
                          <span className="text-xs font-semibold ml-1"
                            style={{color:used?'#6b7280':expired?'#f87171':'#34d399'}}>
                            {used?'✓ Użyte':expired?'⏰ Wygasłe':'● Aktywne'}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-gray-700 truncate max-w-xs">{invUrl}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          {used
                            ? `Użyte ${new Date(inv.used_at!).toLocaleString('pl',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`
                            : expired
                            ? `Wygasło ${new Date(inv.expires_at).toLocaleString('pl',{day:'numeric',month:'short'})}`
                            : `Wygasa ${new Date(inv.expires_at).toLocaleString('pl',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`
                          }
                          {' · '}stworzono {new Date(inv.created_at).toLocaleDateString('pl')}
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {active && (<>
                          <button onClick={()=>copy(invUrl,inv.id)}
                            className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
                            style={{background:'rgba(99,102,241,0.15)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.25)'}}>
                            {copied===inv.id?'✓ Skopiowano':'📋 Kopiuj'}
                          </button>
                          <button onClick={()=>manageInvite(inv.id,'cancel')}
                            className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
                            style={{background:'rgba(251,191,36,0.1)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.25)'}}>
                            ✕ Anuluj
                          </button>
                        </>)}
                        {expired && (
                          <button onClick={()=>manageInvite(inv.id,'extend')}
                            className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
                            style={{background:'rgba(99,102,241,0.1)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.2)'}}>
                            ↻ Przedłuż 7 dni
                          </button>
                        )}
                        {!used && (
                          <button onClick={()=>manageInvite(inv.id,'delete')}
                            className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
                            style={{background:'rgba(239,68,68,0.08)',color:'#f87171',border:'1px solid rgba(239,68,68,0.2)'}}>
                            🗑 Usuń
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── ACTIVITY LOG ── */}
        {activeTab==='activity' && (
          <div>
            <div className="flex gap-2 mb-3 flex-wrap">
              <input className="input flex-1 min-w-[240px]" placeholder="🔍 Filtruj po emailu użytkownika..."
                value={activityFilterUser} onChange={e=>setActivityFilterUser(e.target.value)}/>
              <select className="input w-auto" value={activityFilterAction} onChange={e=>setActivityFilterAction(e.target.value)}>
                <option value="">Wszystkie akcje</option>
                <option value="login">Logowania</option>
                <option value="signup">Rejestracje</option>
                <option value="generate">Generacje AI</option>
                <option value="plan_change">Zmiany planu</option>
                <option value="permissions_change">Zmiany uprawnień</option>
                <option value="error">Błędy</option>
                <option value="delete">Usunięcia</option>
              </select>
              <button onClick={loadActivityLog} className="btn-secondary text-xs">↻ Odśwież</button>
            </div>

            {activityLog.length === 0 ? (
              <div className="card p-8 text-center text-gray-500 text-sm">
                Brak zapisanych zdarzeń.
                <p className="text-[11px] text-gray-600 mt-2">
                  Wymaga utworzenia tabeli <code>activity_log</code> w Supabase. Zobacz docs/SQL_MIGRATION.md
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {activityLog
                  .filter(e => !activityFilterUser || e.user_email?.toLowerCase().includes(activityFilterUser.toLowerCase()))
                  .filter(e => !activityFilterAction || e.action.includes(activityFilterAction))
                  .map(entry => {
                    const ACTION_CFG: Record<string,{icon:string;color:string}> = {
                      login: {icon:'🔓',color:'#34d399'},
                      signup: {icon:'✦',color:'#a5b4fc'},
                      generate: {icon:'⚡',color:'#fbbf24'},
                      plan_change: {icon:'⬆️',color:'#a855f7'},
                      permissions_change: {icon:'🔧',color:'#60a5fa'},
                      error: {icon:'❌',color:'#f87171'},
                      delete: {icon:'🗑',color:'#ef4444'},
                    }
                    const cfg = Object.entries(ACTION_CFG).find(([k]) => entry.action.includes(k))?.[1]
                      || {icon:'·',color:'#6b7280'}
                    return (
                      <div key={entry.id} className="card flex items-center gap-3 py-2.5">
                        <span className="text-base shrink-0" style={{color:cfg.color}}>{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-white truncate">{entry.user_email || entry.user_id}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded font-mono"
                              style={{background:'rgba(255,255,255,0.04)',color:cfg.color}}>{entry.action}</span>
                            {entry.details && <span className="text-xs text-gray-500 truncate">· {entry.details}</span>}
                          </div>
                        </div>
                        <span className="text-[11px] text-gray-600 shrink-0">
                          {new Date(entry.created_at).toLocaleString('pl', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                        </span>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
