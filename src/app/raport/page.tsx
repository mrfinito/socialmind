'use client'
import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { PLATFORMS } from '@/lib/types'
import PlatformIcon from '@/components/PlatformIcon'

interface ReportData {
  executiveSummary: string
  highlights: {metric:string;value:string;change:string;positive:boolean}[]
  platformBreakdown: {platform:string;count:number;percentage:number}[]
  topContent: {topic:string;platform:string;insight:string}[]
  recommendations: string[]
  nextMonthFocus: string
}

const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']

function Dots() { return <span className="inline-flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span> }

export default function RaportPage() {
  const { projectDrafts, activeProject } = useStore()
  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ReportData|null>(null)
  const [error, setError] = useState('')

  const periodDrafts = projectDrafts.filter(d => {
    const date = new Date(d.createdAt)
    return date.getMonth()===selMonth && date.getFullYear()===selYear
  })

  async function generate() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ project: activeProject, drafts: periodDrafts, period: `${MONTHS[selMonth]} ${selYear}` })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false) }
  }

  function printReport() { window.print() }

  function exportTxt() {
    if (!data) return
    let txt = `RAPORT SOCIAL MEDIA\n${activeProject?.name} | ${MONTHS[selMonth]} ${selYear}\n${'═'.repeat(50)}\n\n`
    txt += `PODSUMOWANIE\n${data.executiveSummary}\n\n`
    txt += `WYNIKI\n${data.highlights.map(h=>`${h.metric}: ${h.value} ${h.change}`).join('\n')}\n\n`
    txt += `REKOMENDACJE\n${data.recommendations.map((r,i)=>`${i+1}. ${r}`).join('\n')}\n\n`
    txt += `FOCUS NA KOLEJNY MIESIĄC\n${data.nextMonthFocus}`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt],{type:'text/plain;charset=utf-8'}))
    a.download = `raport_${activeProject?.name}_${MONTHS[selMonth]}_${selYear}.txt`
    a.click()
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">📊 Raport miesięczny</h1>
          <p className="text-gray-500 text-sm mt-1">Generuj profesjonalne podsumowanie dla klienta — gotowe do wysłania</p>
        </div>

        {/* Config */}
        <div className="card mb-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Projekt</label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <span className="text-xl">{activeProject?.emoji}</span>
                <span className="text-sm text-gray-300">{activeProject?.name}</span>
              </div>
            </div>
            <div>
              <label className="label">Miesiąc</label>
              <select className="input" value={selMonth} onChange={e=>setSelMonth(+e.target.value)}>
                {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Rok</label>
              <select className="input" value={selYear} onChange={e=>setSelYear(+e.target.value)}>
                {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <span className="text-indigo-400">📋</span>
            <span className="text-sm text-gray-400">
              Znaleziono <strong className="text-white">{periodDrafts.length} postów</strong> z okresu {MONTHS[selMonth]} {selYear}
            </span>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 mb-3">{error}</p>}
          <button className="btn-primary flex items-center gap-2 px-6 py-3" onClick={generate} disabled={loading}>
            {loading ? <><Dots /> Generuję raport AI...</> : '📊 Generuj raport'}
          </button>
        </div>

        {data && (
          <div id="report-content" className="space-y-5">
            {/* Report header */}
            <div className="rounded-2xl p-6" style={{background:'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(168,85,247,0.08))',border:'1px solid rgba(99,102,241,0.25)'}}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">Raport social media</p>
                  <h2 className="text-xl font-bold text-white">{activeProject?.name}</h2>
                  {activeProject?.client && <p className="text-gray-400 text-sm">{activeProject.client}</p>}
                  <p className="text-gray-500 text-sm mt-1">{MONTHS[selMonth]} {selYear}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={exportTxt} className="btn-secondary text-xs py-2">⬇ TXT</button>
                  <button onClick={printReport} className="btn-secondary text-xs py-2">🖨 Drukuj</button>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{data.executiveSummary}</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-3">
              {data.highlights.map((h,i)=>(
                <div key={i} className="card p-4 text-center">
                  <p className="text-[10px] text-gray-600 mb-2 leading-tight">{h.metric}</p>
                  <p className="text-2xl font-bold text-white">{h.value}</p>
                  {h.change && <p className={`text-xs mt-1 ${h.positive?'text-emerald-400':'text-red-400'}`}>{h.change}</p>}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* Platform breakdown */}
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-4">Podział platform</h3>
                <div className="space-y-3">
                  {data.platformBreakdown.map((p,i)=>(
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={p.platform} size={22}/>
                          <span className="text-xs text-gray-300 capitalize">{p.platform}</span>
                        </div>
                        <span className="text-xs text-gray-500">{p.count} postów ({p.percentage}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                        <div className="h-full rounded-full bg-indigo-500" style={{width:`${p.percentage}%`,transition:'width 0.5s ease'}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top content */}
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-4">Wyróżnione treści</h3>
                <div className="space-y-3">
                  {data.topContent.map((c,i)=>(
                    <div key={i} className="p-3 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <PlatformIcon platform={c.platform} size={20}/>
                        <p className="text-xs font-medium text-gray-200">{c.topic}</p>
                      </div>
                      <p className="text-[11px] text-gray-500">{c.insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4">Rekomendacje</h3>
              <div className="space-y-2">
                {data.recommendations.map((r,i)=>(
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs text-indigo-400 font-semibold shrink-0">{i+1}</div>
                    <p className="text-sm text-gray-300">{r}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Next month */}
            <div className="rounded-2xl p-5" style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)'}}>
              <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">Focus na kolejny miesiąc</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{data.nextMonthFocus}</p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
