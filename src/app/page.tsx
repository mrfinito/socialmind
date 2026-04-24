'use client'
import AppShell from '@/components/layout/AppShell'
import Link from 'next/link'
import PlatformIcon from '@/components/PlatformIcon'
import { useStore } from '@/lib/store'
import { useState, useEffect } from 'react'
import { historyLoad } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'
import { PLATFORMS } from '@/lib/types'

const TIPS = [
  { icon: '◎', text: 'Dodaj więcej emoji w tekście, aby zwiększyć zaangażowanie' },
  { icon: '◈', text: 'Posty z pytaniem w pierwszym zdaniu mają o 32% więcej komentarzy' },
  { icon: '✦', text: 'Spróbuj dodać wezwanie do działania (CTA) na końcu posta' },
]
const TEMPLATES = ['Świadomość marki','Edukacja','Sprzedaż','Zaangażowanie','Ruch na stronie','Budowanie społeczności']

interface RtmBrief { date?: string; opportunities?: { title?: string; category?: string }[] }
interface StrategyBrief { executiveSummary?: string }

export default function Dashboard() {
  const { projectDrafts, ready, dna, selectedPlatforms, activeProject, state, projectMaterials } = useStore()
  const [strategyHistory, setStrategyHistory] = useState<HistoryEntry<StrategyBrief>[]>([])
  const [rtmHistory, setRtmHistory] = useState<HistoryEntry<RtmBrief>[]>([])
  const projectId = activeProject?.id || 'default'

  useEffect(() => {
    setStrategyHistory(historyLoad<StrategyBrief>('strategia', projectId))
    setRtmHistory(historyLoad<RtmBrief>('rtm', projectId))
  }, [projectId])

  if (!ready) return <AppShell><div className="px-8 py-8 text-gray-600 text-sm">Ładowanie...</div></AppShell>

  const posts = (projectDrafts || []).filter(p => p && Array.isArray(p.platforms))

  // Stats
  const platformCounts = PLATFORMS.map(p => ({
    ...p, count: posts.filter(post => post.platforms.includes(p.id)).length
  }))

  // Sparkline data
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    return posts.filter(p => new Date(p.createdAt).toDateString() === d.toDateString()).length
  })
  const maxV = Math.max(...last14, 1)
  const sparkPoints = last14.map((v, i) => `${(i / 13) * 380 + 10},${70 - (v / maxV) * 60}`).join(' ')

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-[1100px]">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Cześć{dna?.brandName ? `, ${dna.brandName}` : ''}! 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">Stwórz angażujące posty w kilka minut.</p>
          </div>
          <Link href="/generuj" className="btn-primary flex items-center gap-2 px-5 py-2.5">
            <span>+</span> Nowy post
          </Link>
        </div>

        {/* Progress bar */}
        <div className="card mb-6">
          <div className="flex items-center">
            {[
              { n: 1, label: 'Marka', sub: 'Zdefiniuj markę', href: '/marka', done: !!dna },
              { n: 2, label: 'Brand DNA', sub: 'Określ tożsamość', href: '/brand-dna', done: !!dna },
              { n: 3, label: 'Platformy', sub: 'Wybierz kanały', href: '/platformy', done: (selectedPlatforms || []).length > 0 },
              { n: 4, label: 'Generuj', sub: 'Twórz treści', href: '/generuj', active: true },
              { n: 5, label: 'Eksport', sub: 'Publikuj', href: '/generuj', done: posts.length > 0 },
            ].map((s, i, arr) => (
              <div key={s.n} className="flex items-center flex-1">
                <Link href={s.href} className="flex items-center gap-2.5 group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                    ${s.active ? 'bg-indigo-500 text-white' : s.done ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-600'}` }
                    style={{ background: s.active ? undefined : s.done ? undefined : 'rgba(255,255,255,0.04)' }}>
                    {s.done ? '✓' : s.n}
                  </div>
                  <div className="hidden sm:block">
                    <p className={`text-xs font-medium ${s.active ? 'text-indigo-300' : s.done ? 'text-emerald-400' : 'text-gray-600'}`}>{s.label}</p>
                    <p className="text-[10px] text-gray-700">{s.sub}</p>
                  </div>
                </Link>
                {i < arr.length - 1 && <div className="flex-1 h-px mx-3" style={{ background: 'rgba(255,255,255,0.06)' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-5 gap-5 mb-5">
          <div className="card col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white text-sm">Wybierz platformy</h2>
                <p className="text-gray-500 text-xs mt-0.5">Gdzie chcesz opublikować post?</p>
              </div>
              <Link href="/platformy" className="text-xs text-gray-500 hover:text-gray-300 border border-white/8 rounded-lg px-3 py-1.5 transition-all">Zarządzaj</Link>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {PLATFORMS.map(p => {
                const active = (selectedPlatforms || []).includes(p.id)
                return (
                  <div key={p.id} className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl border transition-all relative"
                    style={{ background: active ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)', borderColor: active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)' }}>
                    {active && <span className="absolute top-1.5 right-1.5 text-[8px] text-indigo-400">✓</span>}
                    <PlatformIcon platform={p.id} size={36} />
                    <span className="text-xs text-gray-400">{p.name}</span>
                    <span className="text-[10px] text-gray-600">{platformCounts.find(x => x.id === p.id)?.count || 0} postów</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-indigo-400">✦</span>
              <h2 className="font-semibold text-white text-sm">Sugestie AI dla Ciebie</h2>
            </div>
            <div className="space-y-3">
              {TIPS.map((tip, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-indigo-400 text-sm mt-0.5 shrink-0">{tip.icon}</span>
                  <p className="text-xs text-gray-400 leading-relaxed">{tip.text}</p>
                </div>
              ))}
            </div>
            <Link href="/generuj" className="w-full mt-4 block text-center text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl py-2.5 transition-all">
              Zacznij generować →
            </Link>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-5 gap-5 mb-5">
          <div className="card col-span-3">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h2 className="font-semibold text-white text-sm mb-0.5">Szablony tematyczne</h2>
                <p className="text-gray-500 text-xs mb-4">Wybierz cel posta</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map((t, i) => (
                    <Link key={t} href={`/generuj?topic=${encodeURIComponent(t)}`}
                      className={`tag ${i === 0 ? 'tag-active' : 'tag-inactive'}`}>{t}</Link>
                  ))}
                </div>
              </div>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 text-4xl"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)' }}>✦</div>
            </div>
          </div>

          <div className="card col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-sm">Ostatnie wygenerowane</h2>
              <Link href="/kalendarz" className="text-xs text-gray-500 hover:text-gray-400 transition-all">Zobacz wszystkie →</Link>
            </div>
            <div className="space-y-1.5">
              {posts.length === 0
                ? <p className="text-xs text-gray-600 py-3 text-center">Brak postów — <Link href="/generuj" className="text-indigo-400">wygeneruj pierwszy</Link></p>
                : posts.slice(0, 3).map(p => {
                  const plt = PLATFORMS.find(x => x.id === p.platforms[0])
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/3 group transition-all">
                      {plt && <PlatformIcon platform={plt.id} size={32} />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300 truncate">{p.topic || 'Post'}</p>
                        <p className="text-xs text-gray-600">{plt?.name} · {new Date(p.createdAt).toLocaleString('pl', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  )
                })
              }
            </div>
          </div>
        </div>

        {/* Row 3: Quick create + Stats */}
        <div className="grid grid-cols-5 gap-5 mb-5">
          <div className="card col-span-3">
            <h2 className="font-semibold text-white text-sm mb-0.5">Szybkie tworzenie posta</h2>
            <p className="text-gray-500 text-xs mb-5">Wygeneruj kompletny post w 3 krokach</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                {[
                  { n: 1, label: 'Wybierz temat', sub: 'Określ o czym ma być post', active: true },
                  { n: 2, label: 'Dopasuj treść', sub: 'AI przygotuje treść i grafikę', active: false },
                  { n: 3, label: 'Edytuj i publikuj', sub: 'Dostosuj i opublikuj', active: false },
                ].map(s => (
                  <div key={s.n} className={`flex items-center gap-3 ${!s.active ? 'opacity-40' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${s.active ? 'bg-indigo-500 text-white' : 'text-gray-500'}`}
                      style={{ background: s.active ? undefined : 'rgba(255,255,255,0.06)' }}>{s.n}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-200">{s.label}</p>
                      <p className="text-xs text-gray-600">{s.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="label">O czym ma być post?</label>
                  <textarea className="input resize-none text-xs" style={{ minHeight: 70 }}
                    placeholder="Np. rekrutacja do przedszkola, nowość w ofercie..." />
                </div>
                <Link href="/generuj" className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5">
                  Wygeneruj post →
                </Link>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="card col-span-2">
            <h2 className="font-semibold text-white text-sm mb-4">Aktywność (14 dni)</h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: 'Wygenerowane', value: posts.length.toString() },
                { label: 'Platformy', value: (selectedPlatforms || []).length.toString() },
                { label: 'Materiały', value: (projectMaterials || []).length.toString() },
                { label: 'Brand DNA', value: dna ? 'Aktywne' : 'Brak' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-[10px] text-gray-600 mb-1">{s.label}</p>
                  <p className="text-lg font-semibold text-white">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="h-16">
              <svg viewBox="0 0 400 80" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {last14.some(v => v > 0) && (
                  <>
                    <polyline points={sparkPoints} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polygon points={`${sparkPoints} 390,80 10,80`} fill="url(#grad2)" opacity="0.5"/>
                  </>
                )}
                {!last14.some(v => v > 0) && (
                  <line x1="10" y1="70" x2="390" y2="70" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Files + CTA */}
        <div className="grid grid-cols-5 gap-5">
          <div className="card col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-sm">Twoje materiały</h2>
              <Link href="/materialy" className="text-xs text-gray-500 hover:text-gray-400">Zobacz wszystkie →</Link>
            </div>
            {(projectMaterials || []).length === 0
              ? <p className="text-xs text-gray-600 text-center py-4">Brak materiałów · <Link href="/materialy" className="text-indigo-400">dodaj pliki</Link></p>
              : (projectMaterials || []).slice(0, 3).map(m => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/3 transition-all group">
                  <span className="text-xl w-8 text-center">{m.type === 'logo' ? '🔷' : m.type === 'image' ? '🖼' : '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">{m.name}</p>
                    <p className="text-xs text-gray-600">{m.type} · {m.size}</p>
                  </div>
                </div>
              ))
            }
          </div>

          {(strategyHistory.length > 0 || rtmHistory.length > 0) && (
            <div className="col-span-3 grid grid-cols-2 gap-4 mb-4">
              {strategyHistory.length > 0 && (
                <Link href="/strategia" className="card hover:border-indigo-500/40 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🧭</span>
                      <h3 className="text-sm font-semibold text-white">Ostatnia strategia</h3>
                    </div>
                    <span className="text-xs text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{strategyHistory[0].title}</p>
                  <p className="text-[10px] text-gray-600 mb-3">{strategyHistory[0].subtitle} · {new Date(strategyHistory[0].createdAt).toLocaleDateString('pl')}</p>
                  {strategyHistory[0].data.executiveSummary && (
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{strategyHistory[0].data.executiveSummary}</p>
                  )}
                  {strategyHistory.length > 1 && (
                    <p className="text-[10px] text-gray-600 mt-3 pt-3 border-t border-white/5">
                      + {strategyHistory.length - 1} {strategyHistory.length - 1 === 1 ? 'poprzednia' : 'poprzednich'}
                    </p>
                  )}
                </Link>
              )}
              {rtmHistory.length > 0 && (
                <Link href="/rtm" className="card hover:border-indigo-500/40 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚡</span>
                      <h3 className="text-sm font-semibold text-white">Ostatnie RTM</h3>
                    </div>
                    <span className="text-xs text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{rtmHistory[0].title}</p>
                  <p className="text-[10px] text-gray-600 mb-3">{rtmHistory[0].subtitle}</p>
                  {rtmHistory[0].data.opportunities && rtmHistory[0].data.opportunities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rtmHistory[0].data.opportunities.slice(0, 3).map((opp, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{background:'rgba(99,102,241,0.1)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.2)'}}>
                          {opp.title}
                        </span>
                      ))}
                    </div>
                  )}
                  {rtmHistory.length > 1 && (
                    <p className="text-[10px] text-gray-600 mt-3 pt-3 border-t border-white/5">
                      + {rtmHistory.length - 1} {rtmHistory.length - 1 === 1 ? 'poprzednie' : 'poprzednich'}
                    </p>
                  )}
                </Link>
              )}
            </div>
          )}

          <div className="col-span-3 rounded-2xl border border-indigo-500/20 p-6 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.06) 100%)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>✦</div>
              <div>
                <h3 className="font-semibold text-white text-sm">Oszczędzaj czas z SocialMind</h3>
                <p className="text-gray-500 text-xs mt-0.5">Planuj posty z wyprzedzeniem, analizuj wyniki i rośnij szybciej.</p>
              </div>
            </div>
            <Link href="/generuj" className="btn-primary shrink-0">Zacznij teraz →</Link>
          </div>
        </div>

      </div>
    </AppShell>
  )
}
