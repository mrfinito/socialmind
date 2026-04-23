'use client'
import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { PROJECT_COLORS, PROJECT_EMOJIS } from '@/lib/types'
import { useRouter } from 'next/navigation'

export default function ProjektyPage() {
  const { state, createProject, updateProject, deleteProject, switchProject, ready } = useStore()
  const router = useRouter()
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [selColor, setSelColor] = useState(PROJECT_COLORS[0])
  const [selEmoji, setSelEmoji] = useState(PROJECT_EMOJIS[0])
  const [editId, setEditId] = useState<string|null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null)
  const [briefUrl, setBriefUrl] = useState<Record<string,string>>({})
  const [briefLoading, setBriefLoading] = useState<string|null>(null)
  const [copiedBrief, setCopiedBrief] = useState<string|null>(null)

  async function generateBrief(projectId: string, projectName: string) {
    setBriefLoading(projectId)
    try {
      const res = await fetch('/api/brief', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ projectId, clientName: projectName })
      })
      const j = await res.json()
      if (j.ok) setBriefUrl(prev => ({...prev, [projectId]: j.url}))
    } catch {}
    finally { setBriefLoading(null) }
  }

  function copyBrief(projectId: string) {
    navigator.clipboard.writeText(briefUrl[projectId])
    setCopiedBrief(projectId); setTimeout(() => setCopiedBrief(null), 1500)
  }

  function handleCreate() {
    if (!name.trim()) return
    const id = createProject(name, client || undefined, selEmoji, selColor)
    setShowNew(false); setName(''); setClient('')
    router.push('/')
    void id
  }

  function handleSwitch(id: string) {
    switchProject(id)
    router.push('/')
  }

  if (!ready) return <AppShell><div className="px-8 py-8 text-gray-600 text-sm">Ładowanie...</div></AppShell>

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Projekty</h1>
            <p className="text-gray-500 text-sm mt-1">Zarządzaj markami i klientami — każdy projekt ma osobne Brand DNA</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowNew(true)}>
            + Nowy projekt
          </button>
        </div>

        {/* New project modal */}
        {showNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.7)'}}>
            <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{background:'#1a1f2e',border:'1px solid rgba(255,255,255,0.08)'}}>
              <h2 className="text-lg font-semibold text-white">Nowy projekt</h2>
              <div>
                <label className="label">Nazwa projektu / marki</label>
                <input className="input" placeholder="np. Kids&Co, Restauracja Primo..." value={name} onChange={e=>setName(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">Klient (opcjonalnie)</label>
                <input className="input" placeholder="Nazwa firmy klienta" value={client} onChange={e=>setClient(e.target.value)} />
              </div>
              <div>
                <label className="label">Emoji projektu</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {PROJECT_EMOJIS.map(e => (
                    <button key={e} onClick={() => setSelEmoji(e)}
                      className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
                      style={{background: selEmoji===e ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)', border: selEmoji===e ? '1.5px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.08)'}}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Kolor projektu</label>
                <div className="flex gap-2 mt-1">
                  {PROJECT_COLORS.map(c => (
                    <button key={c} onClick={() => setSelColor(c)}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{background:c, borderColor: selColor===c ? 'white' : 'transparent'}} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="btn-secondary flex-1" onClick={() => setShowNew(false)}>Anuluj</button>
                <button className="btn-primary flex-1" onClick={handleCreate} disabled={!name.trim()}>Utwórz projekt</button>
              </div>
            </div>
          </div>
        )}

        {/* Projects grid */}
        <div className="grid grid-cols-2 gap-4">
          {state.projects.map(p => {
            const isActive = p.id === state.activeProjectId
            const draftCount = state.drafts.filter(d => d.projectId === p.id).length
            const isEditing = editId === p.id
            return (
              <div key={p.id} className="card relative group transition-all"
                style={{borderColor: isActive ? `${p.color}40` : 'rgba(255,255,255,0.06)', background: isActive ? `${p.color}08` : '#181c27'}}>
                {isActive && (
                  <div className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{background:`${p.color}25`,color:p.color,border:`1px solid ${p.color}40`}}>
                    Aktywny
                  </div>
                )}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{background:`${p.color}20`,border:`1px solid ${p.color}30`}}>
                    {p.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input className="input text-sm mb-1" defaultValue={p.name}
                        onBlur={e => { updateProject(p.id,{name:e.target.value}); setEditId(null) }}
                        autoFocus />
                    ) : (
                      <p className="font-semibold text-white text-sm leading-tight">{p.name}</p>
                    )}
                    {p.client && <p className="text-xs text-gray-500 mt-0.5">{p.client}</p>}
                    <p className="text-[10px] text-gray-700 mt-1">
                      {p.dna?.industry || 'Brak Brand DNA'} · {draftCount} post{draftCount===1?'':'ów'}
                    </p>
                  </div>
                </div>
                {/* DNA status */}
                <div className="flex gap-2 mb-4">
                  <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg"
                    style={{background: p.dna ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', border: p.dna ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.06)'}}>
                    <span className={p.dna ? 'text-emerald-400' : 'text-gray-600'}>{p.dna ? '✓' : '○'}</span>
                    <span className={p.dna ? 'text-emerald-400' : 'text-gray-600'}>Brand DNA</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg"
                    style={{background: p.selectedPlatforms?.length ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.15)'}}>
                    <span className="text-indigo-400">{p.selectedPlatforms?.length || 0} platform</span>
                  </div>
                </div>
                {briefUrl[p.id] && (
                  <div className="flex items-center gap-2 mb-2 p-2 rounded-xl" style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)'}}>
                    <p className="text-[10px] text-emerald-400 flex-1 truncate font-mono">{briefUrl[p.id]}</p>
                    <button onClick={()=>copyBrief(p.id)} className="text-[10px] text-emerald-400 hover:text-emerald-300 shrink-0">{copiedBrief===p.id?'✓':'kopiuj'}</button>
                  </div>
                )}
                <div className="flex gap-2">
                  {!isActive && (
                    <button onClick={() => handleSwitch(p.id)}
                      className="flex-1 text-xs py-2 rounded-xl border transition-all text-gray-300 hover:text-white"
                      style={{background:'rgba(255,255,255,0.04)',borderColor:'rgba(255,255,255,0.08)'}}>
                      Przełącz
                    </button>
                  )}
                  <button onClick={() => setEditId(isEditing ? null : p.id)}
                    className="text-xs py-2 px-3 rounded-xl border transition-all text-gray-500 hover:text-gray-300"
                    style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.06)'}}>
                    ✏️
                  </button>
                  <button onClick={() => generateBrief(p.id, p.name)} disabled={briefLoading===p.id}
                    className="text-xs py-2 px-3 rounded-xl border transition-all text-gray-400 hover:text-indigo-300"
                    style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.06)'}}>
                    {briefLoading===p.id ? '...' : '📋 Brief'}
                  </button>
                  {state.projects.length > 1 && (
                    confirmDelete === p.id ? (
                      <button onClick={() => { deleteProject(p.id); setConfirmDelete(null) }}
                        className="text-xs py-2 px-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
                        Potwierdź
                      </button>
                    ) : (
                      <button onClick={() => setConfirmDelete(p.id)}
                        className="text-xs py-2 px-3 rounded-xl border transition-all text-gray-600 hover:text-red-400"
                        style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.06)'}}>
                        🗑
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
          {/* Add project card */}
          <button onClick={() => setShowNew(true)}
            className="card flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-indigo-500/30"
            style={{minHeight:180,border:'1.5px dashed rgba(255,255,255,0.08)'}}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)'}}>+</div>
            <p className="text-sm text-gray-500">Dodaj nowy projekt</p>
          </button>
        </div>
      </div>
    </AppShell>
  )
}
