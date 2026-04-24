'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'

interface Brief {
  id: string
  token: string
  business_name: string
  client_name: string
  client_email: string
  status: 'pending' | 'submitted' | 'processed'
  responses: Record<string, string> | null
  generated_dna: Record<string, unknown> | null
  generated_strategy: Record<string, unknown> | null
  created_at: string
  submitted_at: string | null
  expires_at: string
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Wysłano',     color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  submitted: { label: 'Wypełniony',  color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  processed: { label: 'Przetworzony', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
}

export default function BriefsPage() {
  const { activeProject } = useStore()
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newBrief, setNewBrief] = useState({ client_name: '', client_email: '', business_name: '' })
  const [created, setCreated] = useState<{ url: string } | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [selected, setSelected] = useState<Brief | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/brief/list')
      const j = await res.json()
      if (j.ok) setBriefs(j.briefs)
    } finally { setLoading(false) }
  }

  async function create() {
    try {
      const res = await fetch('/api/brief/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newBrief, project_id: activeProject?.id }),
      })
      const j = await res.json()
      if (j.ok) {
        setCreated({ url: j.url })
        setNewBrief({ client_name: '', client_email: '', business_name: '' })
        load()
      }
    } catch {}
  }

  async function processBrief(brief: Brief) {
    setProcessing(brief.id)
    try {
      const res = await fetch('/api/brief/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief_id: brief.id }),
      })
      const j = await res.json()
      if (j.ok) load()
      else alert(j.error)
    } finally { setProcessing(null) }
  }

  async function applyToProject(brief: Brief) {
    if (!brief.generated_dna || !activeProject) return
    // Save to Brand DNA
    const dnaRes = await fetch('/api/dna', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dna: brief.generated_dna, project_id: activeProject.id }),
    }).catch(() => null)
    if (dnaRes?.ok) alert('✅ Brand DNA zaimportowane do projektu')
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">📋 Briefy klientów</h1>
            <p className="text-gray-500 text-sm mt-1">Wysyłaj klientom link do briefu online — AI automatycznie wygeneruje Brand DNA i strategię</p>
          </div>
          <button onClick={() => { setShowNew(true); setCreated(null) }} className="btn-primary">
            + Nowy brief
          </button>
        </div>

        {showNew && !created && (
          <div className="card mb-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Nowy brief dla klienta</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Nazwa firmy</label>
                <input className="input" value={newBrief.business_name}
                  onChange={e => setNewBrief(p => ({...p, business_name: e.target.value}))}
                  placeholder="np. Kids&Co" />
              </div>
              <div>
                <label className="label">Osoba kontaktowa</label>
                <input className="input" value={newBrief.client_name}
                  onChange={e => setNewBrief(p => ({...p, client_name: e.target.value}))} />
              </div>
              <div>
                <label className="label">Email klienta</label>
                <input className="input" type="email" value={newBrief.client_email}
                  onChange={e => setNewBrief(p => ({...p, client_email: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={create} disabled={!newBrief.business_name} className="btn-primary">Stwórz brief</button>
              <button onClick={() => setShowNew(false)} className="btn-ghost">Anuluj</button>
            </div>
          </div>
        )}

        {created && (
          <div className="card mb-6 bg-emerald-500/5 border-emerald-500/20">
            <div className="flex items-start gap-4">
              <span className="text-3xl">✅</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Brief utworzony!</h3>
                <p className="text-sm text-gray-400 mb-4">Wyślij ten link klientowi — wypełni brief, a AI wygeneruje strategię:</p>
                <div className="flex gap-2">
                  <input readOnly value={created.url} className="input flex-1" />
                  <button onClick={() => copyUrl(created.url)} className="btn-primary whitespace-nowrap">
                    {copied ? '✓ Skopiowano' : '📋 Kopiuj link'}
                  </button>
                </div>
                <button onClick={() => { setShowNew(false); setCreated(null) }} className="text-xs text-indigo-400 mt-3">Zamknij</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Ładowanie...</p>
        ) : briefs.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-400 mb-1">Jeszcze nie masz żadnych briefów</p>
            <p className="text-xs text-gray-600">Stwórz pierwszy brief i wyślij klientowi link do wypełnienia</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {briefs.map(b => {
              const cfg = STATUS_CFG[b.status]
              return (
                <div key={b.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{b.business_name || 'Brief'}</h3>
                      {b.client_name && <p className="text-xs text-gray-500">{b.client_name} · {b.client_email}</p>}
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
                      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}40` }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-600 mb-3">
                    Utworzony: {new Date(b.created_at).toLocaleDateString('pl')}
                    {b.submitted_at && ` · Wypełniony: ${new Date(b.submitted_at).toLocaleDateString('pl')}`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {b.status === 'pending' && (
                      <button onClick={() => { const url = `${window.location.origin}/brief/${b.token}`; copyUrl(url) }}
                        className="btn-ghost text-xs">📋 Kopiuj link</button>
                    )}
                    {b.status === 'submitted' && (
                      <button onClick={() => processBrief(b)} disabled={processing === b.id}
                        className="btn-primary text-xs">
                        {processing === b.id ? 'Analizuję...' : '✦ Generuj strategię AI'}
                      </button>
                    )}
                    {b.status === 'processed' && (
                      <>
                        <button onClick={() => setSelected(b)} className="btn-primary text-xs">📄 Zobacz wyniki</button>
                        {activeProject && (
                          <button onClick={() => applyToProject(b)} className="btn-ghost text-xs">→ Importuj do projektu</button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {selected && selected.generated_dna && selected.generated_strategy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70" onClick={() => setSelected(null)}>
            <div className="rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-auto p-8"
              style={{ background: '#0f1423', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs text-indigo-400 font-medium mb-1">Wyniki briefu AI</p>
                  <h2 className="text-2xl font-bold text-white">{selected.business_name}</h2>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white text-2xl">×</button>
              </div>

              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-indigo-400 mb-3">✦ Brand DNA</h3>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-gray-500 text-xs">Marka:</span> <span className="text-white">{String((selected.generated_dna as Record<string,unknown>).brandName || '')}</span></div>
                    <div><span className="text-gray-500 text-xs">USP:</span> <span className="text-gray-300">{String((selected.generated_dna as Record<string,unknown>).usp || '')}</span></div>
                    <div><span className="text-gray-500 text-xs">Ton:</span> <span className="text-gray-300">{String((selected.generated_dna as Record<string,unknown>).tone || '')}</span></div>
                    <div><span className="text-gray-500 text-xs">Persona:</span> <span className="text-gray-300">{String((selected.generated_dna as Record<string,unknown>).persona || '')}</span></div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-indigo-400 mb-3">🧭 Strategia</h3>
                  <p className="text-sm text-gray-300 mb-4">{String((selected.generated_strategy as Record<string,unknown>).executiveSummary || '')}</p>
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 mb-2">Kluczowe rekomendacje:</p>
                    {(((selected.generated_strategy as Record<string,unknown>).recommendations as string[]) || []).map((r, i) => (
                      <p key={i} className="text-xs text-gray-400 flex gap-2"><span className="text-indigo-400">{i + 1}.</span>{r}</p>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
