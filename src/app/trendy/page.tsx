'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import HistoryDrawer from '@/components/HistoryDrawer'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'
import { useStore } from '@/lib/store'
import { PLATFORMS } from '@/lib/types'
import type { Platform } from '@/lib/types'
import PlatformIcon from '@/components/PlatformIcon'

interface TrendItem { topic: string; description: string; momentum: string; platforms: string[]; postIdea: string }
interface HashtagItem { tag: string; volume: string; competition: string; recommendation: string }
interface IdeaItem { title: string; format: string; hook: string; why: string }
interface TrendData { trends: TrendItem[]; hashtags: HashtagItem[]; contentIdeas: IdeaItem[]; bestTimes: Record<string,string>; summary: string }

const M_COLOR: Record<string,string> = { 'rosnacy':'text-emerald-400', 'rosnący':'text-emerald-400', 'stabilny':'text-blue-400', 'opadajacy':'text-orange-400', 'opadający':'text-orange-400' }
const M_ICON: Record<string,string> = { 'rosnacy':'↑', 'rosnący':'↑', 'stabilny':'→', 'opadajacy':'↓', 'opadający':'↓' }
const REC: Record<string,string> = { 'polecany':'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', 'neutralny':'text-gray-400 border-white/10 bg-white/5', 'unikaj':'text-red-400 border-red-500/30 bg-red-500/10' }
const FMT: Record<string,string> = { 'karuzela':'bg-purple-500/20 text-purple-300', 'reel':'bg-pink-500/20 text-pink-300', 'post':'bg-blue-500/20 text-blue-300', 'stories':'bg-orange-500/20 text-orange-300' }

function Dots() { return <span className="inline-flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span> }

export default function TrendyPage() {
  const { state, projectDrafts, dna, selectedPlatforms, activeProject, projectMaterials } = useStore()
  const [niche, setNiche] = useState(dna?.industry || '')
  const [selPlat, setSelPlat] = useState<Platform[]>((selectedPlatforms || []).length ? selectedPlatforms || [] : ['facebook','instagram'])
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<HistoryEntry<unknown>[]>([])
  const projectId = dna?.brandName || 'default'
  useEffect(() => { setHistory(historyLoad('trendy', projectId)) }, [projectId])
  const [data, setData] = useState<TrendData|null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<number|null>(null)

  async function research() {
    if (!niche.trim()) { setError('Wpisz niszę'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/trends', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({niche, platforms:selPlat}) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
      const entry = historySave('trendy', projectId, {
        title: industry || dna?.industry || 'Trendy',
        subtitle: new Date().toLocaleDateString('pl'),
        data: j.data,
      })
      setHistory(prev => [entry, ...prev].slice(0, 20))
    } catch(e: unknown) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false) }
  }

  function tog(id: Platform) { setSelPlat(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]) }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">📡 Research trendów</h1>
          <p className="text-gray-500 text-sm mt-1">Odkryj co jest teraz trendy w Twojej niszy — hashtagi, tematy, najlepsze godziny</p>
        </div>

        <div className="card mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="label">Nisza / branża</label>
              <input className="input" placeholder="np. przedszkole, fitness, nieruchomości..."
                value={niche} onChange={e=>setNiche(e.target.value)} onKeyDown={e=>e.key==='Enter'&&research()} />
            </div>
            <div>
              <label className="label">Platformy</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={()=>tog(p.id as Platform)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all"
                    style={{background: selPlat.includes(p.id as Platform)?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.03)', borderColor: selPlat.includes(p.id as Platform)?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.08)'}}>
                    <PlatformIcon platform={p.id} size={16} />
                    <span className={selPlat.includes(p.id as Platform)?'text-indigo-300':'text-gray-500'}>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
          <button className="btn-primary flex items-center gap-2 px-6 py-3" onClick={research} disabled={loading}>
            {loading ? <><Dots /> Analizuję trendy...</> : '📡 Zbadaj trendy'}
          </button>
        </div>

        {data && (
          <div className="space-y-5">
            <div className="rounded-2xl p-5 border border-indigo-500/20" style={{background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(168,85,247,0.05))'}}>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">Podsumowanie strategii</p>
              <p className="text-gray-200 text-sm leading-relaxed">{data.summary}</p>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-4">🔥 Trendy w niszy</h2>
              <div className="space-y-3">
                {(data.trends||[]).map((t,i)=>(
                  <div key={i} className="p-4 rounded-xl" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)'}}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-semibold ${M_COLOR[t.momentum]||'text-gray-300'}`}>{M_ICON[t.momentum]||'→'} {t.topic}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'rgba(255,255,255,0.06)',color:'#9ca3af'}}>{t.momentum}</span>
                        </div>
                        <p className="text-xs text-gray-500">{t.description}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">{(t.platforms||[]).slice(0,3).map(p=><PlatformIcon key={p} platform={p} size={20}/>)}</div>
                    </div>
                    <div className="flex items-start gap-2 mt-2 pt-2 border-t border-white/5">
                      <span className="text-indigo-400 text-xs shrink-0 mt-0.5">✦</span>
                      <p className="text-xs text-gray-400 leading-relaxed flex-1">{t.postIdea}</p>
                      <button onClick={()=>{navigator.clipboard.writeText(t.postIdea);setCopied(i);setTimeout(()=>setCopied(null),1500)}}
                        className="shrink-0 text-[10px] text-gray-600 hover:text-gray-400 border border-white/8 rounded px-1.5 py-0.5">
                        {copied===i?'✓':'kopiuj'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="card">
                <h2 className="text-sm font-semibold text-white mb-4"># Hashtagi</h2>
                <div className="space-y-2">
                  {(data.hashtags||[]).map((h,i)=>(
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/4 last:border-0">
                      <span className={`text-xs font-mono px-2 py-1 rounded-lg border ${REC[h.recommendation]||'text-gray-400 border-white/10 bg-white/5'}`}>{h.tag}</span>
                      <span className="text-[10px] text-gray-600">vol: {h.volume} · konk: {h.competition}</span>
                    </div>
                  ))}
                </div>
                <button onClick={()=>navigator.clipboard.writeText((data.hashtags||[]).map(h=>h.tag).join(' '))}
                  className="mt-3 pt-3 border-t border-white/6 text-xs text-indigo-400 hover:text-indigo-300 transition-colors block w-full text-left">
                  Kopiuj wszystkie →
                </button>
              </div>

              <div className="card">
                <h2 className="text-sm font-semibold text-white mb-4">💡 Pomysły na content</h2>
                <div className="space-y-3">
                  {(data.contentIdeas||[]).map((idea,i)=>(
                    <div key={i} className="p-3 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${FMT[idea.format]||'bg-gray-500/20 text-gray-300'}`}>{idea.format}</span>
                        <p className="text-xs font-semibold text-gray-200">{idea.title}</p>
                      </div>
                      <p className="text-xs text-indigo-300 mb-1 italic">&ldquo;{idea.hook}&rdquo;</p>
                      <p className="text-[11px] text-gray-600">{idea.why}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-4">⏰ Najlepsze godziny publikacji</h2>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(data.bestTimes||{}).filter(([p])=>selPlat.includes(p as Platform)).map(([platform,time])=>(
                  <div key={platform} className="flex items-center gap-3 p-3 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <PlatformIcon platform={platform} size={32}/>
                    <div>
                      <p className="text-xs font-medium text-gray-300 capitalize">{platform}</p>
                      <p className="text-[11px] text-gray-500">{time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
