'use client'
import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { PLATFORMS } from '@/lib/types'
import type { PostStatus, Platform, GeneratedPost } from '@/lib/types'
import PlatformIcon from '@/components/PlatformIcon'
import Link from 'next/link'

const STATUS_CONFIG: Record<PostStatus, {label:string;color:string;bg:string;border:string}> = {
  draft:     {label:'Szkic',       color:'#9ca3af',bg:'rgba(156,163,175,0.1)',border:'rgba(156,163,175,0.2)'},
  scheduled: {label:'Zaplanowany', color:'#60a5fa',bg:'rgba(96,165,250,0.1)', border:'rgba(96,165,250,0.2)'},
  published: {label:'Opublikowany',color:'#34d399',bg:'rgba(52,211,153,0.1)', border:'rgba(52,211,153,0.2)'},
  archived:  {label:'Archiwum',    color:'#6b7280',bg:'rgba(107,114,128,0.1)',border:'rgba(107,114,128,0.2)'},
}

export default function BibliotekaPage() {
  const { projectDrafts, updateDraft, deleteDraft, scheduleDraft, markPublished, activeProject } = useStore()
  const [filterStatus, setFilterStatus] = useState<PostStatus|'all'>('all')
  const [filterPlatform, setFilterPlatform] = useState<Platform|'all'>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [schedulingId, setSchedulingId] = useState<string|null>(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('12:00')

  const filtered = projectDrafts.filter(d => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    if (filterPlatform !== 'all' && !d.platforms.includes(filterPlatform)) return false
    if (search && !d.topic.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  function handleSchedule(id: string) {
    if (!scheduleDate) return
    scheduleDraft(id, `${scheduleDate}T${scheduleTime}:00`)
    setSchedulingId(null)
  }

  function copyPost(draft: typeof projectDrafts[0]) {
    const texts = draft.platforms.map(p => {
      const post = draft.content[p] as GeneratedPost|undefined
      return post ? `=== ${p.toUpperCase()} ===\n${post.text}` : ''
    }).filter(Boolean).join('\n\n')
    navigator.clipboard.writeText(texts)
  }

  const counts = {
    all: projectDrafts.length,
    draft: projectDrafts.filter(d=>d.status==='draft').length,
    scheduled: projectDrafts.filter(d=>d.status==='scheduled').length,
    published: projectDrafts.filter(d=>d.status==='published').length,
    archived: projectDrafts.filter(d=>d.status==='archived').length,
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Biblioteka postów</h1>
            <p className="text-gray-500 text-sm mt-1">
              {activeProject?.name} · {counts.all} post{counts.all===1?'':'ów'}
            </p>
          </div>
          <Link href="/generuj" className="btn-primary">+ Nowy post</Link>
        </div>

        {/* Filters */}
        <div className="card mb-5 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {(['all','draft','scheduled','published','archived'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                style={{
                  background: filterStatus===s ? (s==='all' ? 'rgba(99,102,241,0.2)' : STATUS_CONFIG[s as PostStatus]?.bg) : 'rgba(255,255,255,0.03)',
                  borderColor: filterStatus===s ? (s==='all' ? 'rgba(99,102,241,0.4)' : STATUS_CONFIG[s as PostStatus]?.border) : 'rgba(255,255,255,0.08)',
                  color: filterStatus===s ? (s==='all' ? '#a5b4fc' : STATUS_CONFIG[s as PostStatus]?.color) : '#6b7280',
                }}>
                {s==='all' ? 'Wszystkie' : STATUS_CONFIG[s as PostStatus]?.label} ({counts[s]})
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <input className="input flex-1" placeholder="Szukaj po temacie..." value={search} onChange={e=>setSearch(e.target.value)} />
            <select className="input w-44" value={filterPlatform} onChange={e=>setFilterPlatform(e.target.value as Platform|'all')}>
              <option value="all">Wszystkie platformy</option>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-400 font-medium mb-1">Brak postów</p>
            <p className="text-gray-600 text-sm mb-5">{search ? 'Zmień kryteria wyszukiwania' : 'Zacznij generować posty'}</p>
            <Link href="/generuj" className="btn-primary">Generuj pierwszy post →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(draft => {
              const st = STATUS_CONFIG[draft.status]
              const isExpanded = expandedId === draft.id
              const isScheduling = schedulingId === draft.id
              return (
                <div key={draft.id} className="card p-0 overflow-hidden transition-all">
                  {/* Header row */}
                  <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-white/2 transition-all"
                    onClick={() => setExpandedId(isExpanded ? null : draft.id)}>
                    <div className="flex gap-1 shrink-0">
                      {draft.platforms.slice(0,3).map(p => <PlatformIcon key={p} platform={p} size={24}/>)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{draft.topic || 'Post bez tematu'}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {new Date(draft.updatedAt).toLocaleString('pl',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                        {draft.scheduledAt && ` · 📅 ${new Date(draft.scheduledAt).toLocaleString('pl',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                      style={{background:st.bg,color:st.color,border:`1px solid ${st.border}`}}>
                      {st.label}
                    </span>
                    <span className="text-gray-600 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-white/5">
                      {draft.platforms.map(platform => {
                        const post = draft.content[platform] as GeneratedPost|undefined
                        if (!post) return null
                        return (
                          <div key={platform} className="px-5 py-4 border-b border-white/4 last:border-0">
                            <div className="flex items-center gap-2 mb-2">
                              <PlatformIcon platform={platform} size={22}/>
                              <span className="text-xs font-medium text-gray-400">{PLATFORMS.find(p=>p.id===platform)?.name}</span>
                              <span className="text-[10px] text-gray-600">{post.text?.length} zn.</span>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mb-2">{post.text}</p>
                            {(post.generatedImageUrl || post.editedImageUrl) && (
                              <div className="mt-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={post.editedImageUrl || post.generatedImageUrl} alt="" className="rounded-xl max-h-48 object-cover" />
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Actions */}
                      {isScheduling ? (
                        <div className="px-5 py-3 flex items-center gap-3 bg-white/2">
                          <span className="text-xs text-gray-400">Zaplanuj na:</span>
                          <input type="date" className="input text-xs py-1.5 w-36" value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)} />
                          <input type="time" className="input text-xs py-1.5 w-28" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)} />
                          <button className="btn-primary text-xs py-1.5 px-4" onClick={() => handleSchedule(draft.id)}>Zapisz</button>
                          <button className="btn-ghost text-xs" onClick={() => setSchedulingId(null)}>Anuluj</button>
                        </div>
                      ) : (
                        <div className="px-5 py-3 flex items-center gap-2 flex-wrap bg-white/2">
                          <button onClick={() => copyPost(draft)} className="btn-ghost text-xs py-1.5">📋 Kopiuj teksty</button>
                          {draft.status !== 'published' && (
                            <button onClick={() => markPublished(draft.id)} className="btn-ghost text-xs py-1.5 text-emerald-400">✓ Oznacz jako opublikowany</button>
                          )}
                          {draft.status !== 'scheduled' && draft.status !== 'published' && (
                            <button onClick={() => { setSchedulingId(draft.id); setScheduleDate('') }} className="btn-ghost text-xs py-1.5 text-blue-400">📅 Zaplanuj</button>
                          )}
                          <button onClick={() => updateDraft(draft.id,{status:'archived'})} className="btn-ghost text-xs py-1.5 text-gray-600">Archiwizuj</button>
                          <button onClick={() => deleteDraft(draft.id)} className="btn-ghost text-xs py-1.5 text-red-400 ml-auto">Usuń</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
