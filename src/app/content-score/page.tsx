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

interface Category { name:string; score:number; max:number; icon:string; feedback:string }
interface ScoreData {
  totalScore:number; benchmark:number; verdict:string
  categories:Category[]
  topSuggestion:string; improvedVersion:string
}

function Dots() { return <span className="inline-flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span> }

function ScoreRing({score,size=80}:{score:number;size:number}) {
  const color = score>=75?'#34d399':score>=55?'#fbbf24':'#f87171'
  const r=(size-8)/2, circ=2*Math.PI*r, dash=(score/100)*circ
  return (
    <div className="relative" style={{width:size,height:size}}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-[9px] text-gray-600">/100</span>
      </div>
    </div>
  )
}

const VERDICT_CONFIG: Record<string,{label:string;color:string;bg:string;emoji:string}> = {
  swietny: {label:'Świetny!',    color:'#34d399', bg:'rgba(52,211,153,0.12)',  emoji:'🚀'},
  dobry:   {label:'Dobry',       color:'#60a5fa', bg:'rgba(96,165,250,0.12)',  emoji:'👍'},
  sredni:  {label:'Średni',      color:'#fbbf24', bg:'rgba(251,191,36,0.12)',  emoji:'⚡'},
  slaby:   {label:'Słaby',       color:'#f87171', bg:'rgba(248,113,113,0.12)', emoji:'🔧'},
}

const EXAMPLE_POSTS = [
  { platform: 'instagram', text: 'Właśnie otworzyliśmy zapisy na rok 2026! 🎉 Nasze przedszkole oferuje dwujęzyczną edukację metodą Montessori. Zapraszamy na dni otwarte w każdą sobotę. Zapisz się przez link w bio! #przedszkole #montessori #edukacja #warszawa' },
  { platform: 'linkedin', text: 'Zarządzanie zespołem w 2024 roku wymaga nowego podejścia. Po przeanalizowaniu ponad 200 firm odkryliśmy 3 kluczowe wzorce które różnią liderów od menedżerów. Który z nich stosujesz?' },
  { platform: 'facebook', text: 'Nowa kolekcja już dostępna! Sprawdź co przygotowaliśmy na sezon.' },
]

export default function ContentScorePage() {
  const { dna } = useStore()
  const [text, setText] = useState('')
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ScoreData|null>(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<HistoryEntry<ScoreData>[]>([])
  const projectId = dna?.brandName || 'default'
  useEffect(() => { setHistory(historyLoad<ScoreData>('content-score', projectId)) }, [projectId])
  const [showImproved, setShowImproved] = useState(false)
  const [copied, setCopied] = useState(false)

  async function score() {
    if (!text.trim()) { setError('Wpisz tekst do oceny'); return }
    setLoading(true); setError(''); setData(null); setShowImproved(false)
    try {
      const res = await fetch('/api/content-score', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ text, platform, dna })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
      const entry = historySave<ScoreData>('content-score', projectId, {
        title: text.slice(0, 60),
        subtitle: `${platform} · ${j.data.totalScore}/100`,
        data: j.data,
      })
      setHistory(prev => [entry, ...prev].slice(0, 20))
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false) }
  }

  function copy(t: string) {
    navigator.clipboard.writeText(t)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  const verdict = data ? (VERDICT_CONFIG[data.verdict] || VERDICT_CONFIG.sredni) : null
  const diff = data ? data.totalScore - data.benchmark : 0

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">📊 Content Score</h1>
          <p className="text-gray-500 text-sm mt-1">Oceń swój post przed publikacją — AI sprawdza 8 kryteriów i sugeruje poprawki</p>
          <div className="mt-3">
            <HistoryDrawer<ScoreData>
              module="content-score" projectId={projectId} entries={history}
              icon="📊"
              onLoad={e => { setData(e.data); setText('') }}
              onDelete={id => setHistory(prev => prev.filter(e => e.id !== id))}
              formatTitle={e => e.title}
              formatSubtitle={e => e.subtitle || ''}
            />
          </div>
        </div>

        {/* Input */}
        <div className="card mb-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label">Tekst posta do oceny</label>
              <span className="text-xs text-gray-600">{text.length} znaków</span>
            </div>
            <textarea className="input resize-y w-full" style={{minHeight:140}}
              placeholder="Wklej tutaj tekst posta który chcesz ocenić..."
              value={text} onChange={e => setText(e.target.value)}/>
          </div>

          {/* Example posts */}
          <div>
            <p className="text-xs text-gray-600 mb-2">Przykłady do przetestowania:</p>
            <div className="flex gap-2 flex-wrap">
              {EXAMPLE_POSTS.map((ex, i) => (
                <button key={i} onClick={() => { setText(ex.text); setPlatform(ex.platform as Platform) }}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all hover:border-indigo-500/30 hover:text-gray-300"
                  style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',color:'#6b7280'}}>
                  Przykład {i+1} ({ex.platform})
                </button>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="label">Platforma</label>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setPlatform(p.id as Platform)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                  style={{
                    background: platform===p.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${platform===p.id ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    color: platform===p.id ? '#a5b4fc' : '#6b7280',
                  }}>
                  <PlatformIcon platform={p.id} size={18}/>
                  <span className="text-xs">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {dna && (
            <div className="flex items-center gap-2 text-xs text-indigo-400/80 bg-indigo-500/8 border border-indigo-500/15 rounded-xl px-3 py-2">
              <span>🧬</span> Ocena uwzględni zgodność z Brand DNA: <strong>{dna.brandName}</strong> · ton: {dna.tone}
            </div>
          )}
          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
          <button className="btn-primary flex items-center gap-2 px-6 py-3" onClick={score} disabled={loading||!text.trim()}>
            {loading ? <><Dots/> Oceniam post...</> : '📊 Oceń posta'}
          </button>
        </div>

        {/* Results */}
        {data && verdict && (
          <div className="space-y-5">
            {/* Score header */}
            <div className="rounded-2xl p-6 flex items-center gap-6"
              style={{background:`linear-gradient(135deg,${verdict.bg},rgba(255,255,255,0.02))`,border:`1px solid ${verdict.color}30`}}>
              <ScoreRing score={data.totalScore} size={90}/>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl">{verdict.emoji}</span>
                  <h2 className="text-xl font-bold text-white">{verdict.label}</h2>
                  <span className="text-sm px-3 py-1 rounded-full font-semibold"
                    style={{background:verdict.bg,color:verdict.color,border:`1px solid ${verdict.color}30`}}>
                    {data.totalScore}/100
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">Benchmark branży: <strong className="text-gray-300">{data.benchmark}/100</strong></span>
                  <span className={`font-semibold ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {diff >= 0 ? `+${diff}` : diff} vs benchmark
                  </span>
                </div>
              </div>
            </div>

            {/* Top suggestion */}
            <div className="rounded-2xl p-4 flex items-start gap-3"
              style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.2)'}}>
              <span className="text-xl shrink-0">💡</span>
              <div>
                <p className="text-xs font-semibold text-amber-400 mb-1">Najważniejsza zmiana</p>
                <p className="text-sm text-gray-300">{data.topSuggestion}</p>
              </div>
            </div>

            {/* Categories */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4">Ocena szczegółowa</h3>
              <div className="space-y-4">
                {data.categories.map((cat, i) => {
                  const pct = cat.max > 0 ? (cat.score / cat.max) * 100 : 0
                  const barColor = pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171'
                  return (
                    <div key={i}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-base w-6 text-center">{cat.icon}</span>
                        <span className="text-sm text-gray-300 flex-1">{cat.name}</span>
                        <span className="text-xs font-semibold" style={{color:barColor}}>
                          {cat.score}/{cat.max}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{width:`${pct}%`,background:barColor}}/>
                        </div>
                        <p className="text-[11px] text-gray-500 flex-[2] leading-tight">{cat.feedback}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Improved version */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">✨ Poprawiona wersja AI</h3>
                <div className="flex gap-2">
                  <button onClick={() => setShowImproved(v => !v)} className="btn-ghost text-xs py-1.5">
                    {showImproved ? 'Ukryj' : 'Pokaż'}
                  </button>
                  {showImproved && (
                    <button onClick={() => copy(data.improvedVersion)} className="btn-secondary text-xs py-1.5">
                      {copied ? '✓ Skopiowano' : 'Kopiuj'}
                    </button>
                  )}
                </div>
              </div>
              {showImproved && (
                <div className="p-4 rounded-xl" style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.15)'}}>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{data.improvedVersion}</p>
                </div>
              )}
              {!showImproved && (
                <p className="text-xs text-gray-600">AI przygotował poprawioną wersję posta z zastosowanymi sugestiami — kliknij "Pokaż"</p>
              )}
            </div>

            {/* Re-score button */}
            <button onClick={() => { setData(null); window.scrollTo(0,0) }}
              className="btn-secondary w-full">
              ← Oceń inny post
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
