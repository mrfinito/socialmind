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

interface Variant {
  id: string; label: string; text: string; hook: string; strategy: string; imagePrompt: string
  scores: { hook: number; clarity: number; cta: number; engagement: number; brandFit: number }
  totalScore: number; pros: string[]; cons: string[]; bestFor: string
}
interface ABData { platform: string; topic: string; variants: Variant[]; winner: string; winnerReason: string; testingTip: string }

const GOALS = ['Zaangażowanie','Sprzedaż','Ruch na stronę','Świadomość marki','Pozyskiwanie followersów']
const SCORE_LABELS: Record<string,string> = { hook:'Hook', clarity:'Jasność', cta:'CTA', engagement:'Zaangażowanie', brandFit:'Brand fit' }

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 85 ? '#6ee7b7' : value >= 70 ? '#93c5fd' : '#fbbf24'
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-gray-500">{SCORE_LABELS[label]||label}</span>
        <span style={{color}} className="font-semibold">{value}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
        <div className="h-full rounded-full transition-all" style={{width:`${value}%`, background:color}} />
      </div>
    </div>
  )
}

function Dots() { return <span className="inline-flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span> }

export default function ABTestyPage() {
  const { state, projectDrafts, dna, selectedPlatforms, activeProject, projectMaterials } = useStore()
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [topic, setTopic] = useState('')
  const [goal, setGoal] = useState('Zaangażowanie')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ABData|null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string|null>(null)
  const [copied, setCopied] = useState<string|null>(null)

  async function generate() {
    if (!topic.trim()) { setError('Wpisz temat posta'); return }
    setLoading(true); setError(''); setData(null); setSelected(null)
    try {
      const res = await fetch('/api/ab-score', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ platform, topic, goal, masterPrompt: dna?.masterPrompt, tone: dna?.tone })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
      setSelected(j.data.winner)
    } catch(e: unknown) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false) }
  }

  function copyVariant(v: Variant) {
    navigator.clipboard.writeText(v.text)
    setCopied(v.id)
    setTimeout(() => setCopied(null), 1500)
  }

  const VARIANT_COLORS: Record<string,{bg:string;border:string;badge:string}> = {
    A: { bg:'rgba(99,102,241,0.06)', border:'rgba(99,102,241,0.2)', badge:'bg-indigo-500' },
    B: { bg:'rgba(168,85,247,0.06)', border:'rgba(168,85,247,0.2)', badge:'bg-purple-500' },
    C: { bg:'rgba(20,184,166,0.06)', border:'rgba(20,184,166,0.2)', badge:'bg-teal-500' },
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">🧪 Testy A/B</h1>
          <p className="text-gray-500 text-sm mt-1">Generuj 3 warianty tego samego posta z AI scoringiem — wybierz najlepszy przed publikacją</p>
        </div>

        <div className="card mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="label">Temat posta</label>
              <textarea className="input resize-none" style={{minHeight:80}}
                placeholder="np. Prezentujemy nową usługę X, Rekrutacja na stanowisko Y, Porady jak zaoszczędzić..."
                value={topic} onChange={e=>setTopic(e.target.value)} />
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Platforma</label>
                <div className="flex gap-2 flex-wrap">
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => setPlatform(p.id as Platform)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all"
                      style={{ background: platform===p.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', borderColor: platform===p.id ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)' }}>
                      <PlatformIcon platform={p.id} size={16}/>
                      <span className={platform===p.id ? 'text-indigo-300' : 'text-gray-500'}>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Cel posta</label>
                <div className="flex gap-2 flex-wrap">
                  {GOALS.map(g => (
                    <button key={g} onClick={() => setGoal(g)}
                      className={`tag ${goal===g ? 'tag-active' : 'tag-inactive'}`}>{g}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
          <button className="btn-primary flex items-center gap-2 px-6 py-3" onClick={generate} disabled={loading}>
            {loading ? <><Dots /> Generuję 3 warianty A/B...</> : '🧪 Generuj warianty A/B'}
          </button>
        </div>

        {data && (
          <div className="space-y-5">
            {/* Winner banner */}
            <div className="rounded-2xl p-5 border border-emerald-500/20" style={{background:'rgba(16,185,129,0.06)'}}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-300">Rekomendowany wariant: <strong>{data.winner}</strong></p>
                  <p className="text-xs text-gray-400 mt-1">{data.winnerReason}</p>
                  <p className="text-xs text-gray-600 mt-2 italic">💡 {data.testingTip}</p>
                </div>
              </div>
            </div>

            {/* Variants */}
            <div className="grid grid-cols-3 gap-4">
              {(data.variants||[]).map(v => {
                const colors = VARIANT_COLORS[v.id] || VARIANT_COLORS.A
                const isWinner = data.winner === v.id
                const isSelected = selected === v.id
                return (
                  <div key={v.id}
                    onClick={() => setSelected(v.id)}
                    className="rounded-2xl p-5 cursor-pointer transition-all"
                    style={{ background: isSelected ? colors.bg : 'rgba(255,255,255,0.02)', border: `1.5px solid ${isSelected ? colors.border : 'rgba(255,255,255,0.07)'}`, boxShadow: isSelected ? `0 0 0 1px ${colors.border}` : 'none' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full ${colors.badge} text-white text-xs font-bold flex items-center justify-center`}>{v.id}</span>
                        <span className="text-xs font-medium text-gray-300">{v.label}</span>
                      </div>
                      {isWinner && <span className="text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-2 py-0.5">🏆 Top</span>}
                    </div>

                    {/* Score ring */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full border-4 flex items-center justify-center shrink-0"
                        style={{ borderColor: v.totalScore >= 85 ? '#6ee7b7' : v.totalScore >= 70 ? '#93c5fd' : '#fbbf24' }}>
                        <span className="text-sm font-bold text-white">{v.totalScore}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">{v.strategy}</p>
                        <p className="text-[10px] text-gray-600 italic">&ldquo;{v.hook}&rdquo;</p>
                      </div>
                    </div>

                    {/* Score bars */}
                    <div className="mb-4">
                      {Object.entries(v.scores).map(([k,val]) => <ScoreBar key={k} label={k} value={val} />)}
                    </div>

                    {/* Pros / Cons */}
                    <div className="space-y-1 mb-3">
                      {v.pros.map((p,i) => <p key={i} className="text-[11px] text-emerald-400 flex items-start gap-1"><span>+</span>{p}</p>)}
                      {v.cons.map((c,i) => <p key={i} className="text-[11px] text-red-400 flex items-start gap-1"><span>−</span>{c}</p>)}
                    </div>
                    <p className="text-[10px] text-gray-600 border-t border-white/5 pt-2">{v.bestFor}</p>
                  </div>
                )
              })}
            </div>

            {/* Selected variant full text */}
            {selected && data.variants.find(v => v.id === selected) && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white">
                    Wariant {selected} — pełny tekst
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={() => copyVariant(data.variants.find(v=>v.id===selected)!)}
                      className="btn-secondary text-xs py-2">
                      {copied===selected ? '✓ Skopiowano' : 'Kopiuj tekst'}
                    </button>
                    <button onClick={() => navigator.clipboard.writeText(data.variants.find(v=>v.id===selected)?.imagePrompt||'')}
                      className="btn-ghost text-xs py-2">Kopiuj prompt grafiki</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-5">
                  <div className="col-span-2">
                    <p className="text-[10px] text-gray-600 mb-2">Tekst posta dla {data.platform}</p>
                    <div className="p-4 rounded-xl" style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.08)'}}>
                      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {data.variants.find(v=>v.id===selected)?.text}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-2">Prompt do grafiki</p>
                    <div className="p-3 rounded-xl" style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.08)'}}>
                      <p className="text-[11px] font-mono text-gray-500 leading-relaxed">
                        {data.variants.find(v=>v.id===selected)?.imagePrompt}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-3 p-3 rounded-xl" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                      <PlatformIcon platform={data.platform} size={28}/>
                      <div>
                        <p className="text-xs text-gray-400">{PLATFORMS.find(p=>p.id===data.platform)?.name}</p>
                        <p className="text-[11px] text-gray-600">{data.variants.find(v=>v.id===selected)?.text.length} znaków</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
