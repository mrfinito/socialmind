'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'
import { SearchToggle, useModuleSearchPref } from '@/components/SearchToggle'

interface Section {
  id: string
  title: string
  content: string
  bullets?: string[]
  stats?: Array<{ label: string; value: string; change: string; direction: string }>
}

interface NewsletterData {
  subject: string
  preheader: string
  greeting: string
  intro: string
  sections: Section[]
  callout?: { type: string; title: string; text: string }
  cta: { text: string; buttonText: string; buttonUrl: string }
  closing: string
  signature: string
}

const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']

export default function NewsletterPage() {
  const { dna, activeProject, projectDrafts } = useStore()
  const projectId = activeProject?.id || 'default'
  const now = new Date()
  const [period, setPeriod] = useState(`${MONTHS[now.getMonth()]} ${now.getFullYear()}`)
  const [agencyName, setAgencyName] = useState('')
  const [reach, setReach] = useState('')
  const [engagement, setEngagement] = useState('')
  const [followers, setFollowers] = useState('')
  const [conversions, setConversions] = useState('')
  const [kpiNotes, setKpiNotes] = useState('')
  const [plans, setPlans] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<NewsletterData | null>(null)
  const [history, setHistory] = useState<HistoryEntry<NewsletterData>[]>([])
  const [copyHtml, setCopyHtml] = useState(false)
  const [useSearch, setUseSearch] = useModuleSearchPref()

  useEffect(() => {
    setHistory(historyLoad<NewsletterData>('newsletter', projectId))
    try {
      const customAppName = localStorage.getItem('sm:custom-app-name')
      if (customAppName) setAgencyName(customAppName)
    } catch {}
  }, [projectId])

  async function generate() {
    setLoading(true); setError(''); setData(null)
    try {
      const posts = projectDrafts.slice(0, 20).map(d => ({
        topic: d.topic,
        platform: (d.platforms || []).join('+'),
        performance: undefined,
      }))
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          projectName: activeProject?.name || 'Klient',
          agencyName: agencyName || undefined,
          posts,
          kpi: { reach, engagement, followers, conversions, notes: kpiNotes },
          plans,
          dna,
          useSearch,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
      const entry = historySave<NewsletterData>('newsletter', projectId, {
        title: `Newsletter ${period}`,
        subtitle: `${activeProject?.name || ''} · ${j.data.sections?.length || 0} sekcji`,
        data: j.data,
      })
      setHistory(prev => [entry, ...prev].slice(0, 20))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally { setLoading(false) }
  }

  function buildHTML() {
    if (!data) return ''
    // Escape user/AI content to prevent broken HTML or XSS in clipboard/email
    const esc = (s: unknown): string => String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(data.subject)}</title>
<style>
body { margin: 0; padding: 0; font-family: -apple-system, sans-serif; color: #1f2937; background: #f9fafb; }
.wrap { max-width: 600px; margin: 0 auto; padding: 24px; background: #fff; }
h1 { font-size: 24px; color: #111; margin: 0 0 16px; }
h2 { font-size: 18px; color: #111; margin: 24px 0 12px; }
p { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 12px; }
ul { padding-left: 20px; margin: 0 0 16px; }
li { font-size: 14px; color: #4b5563; margin: 4px 0; }
.preheader { font-size: 12px; color: #9ca3af; margin-bottom: 8px; }
.stats { display: flex; gap: 12px; margin: 16px 0; flex-wrap: wrap; }
.stat { flex: 1; min-width: 140px; padding: 12px; background: #f3f4f6; border-radius: 8px; }
.stat-value { font-size: 24px; font-weight: bold; color: #111; }
.stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
.stat-change-up { color: #10b981; font-size: 12px; }
.stat-change-down { color: #ef4444; font-size: 12px; }
.callout { padding: 16px; background: #eef2ff; border-left: 4px solid #6366f1; border-radius: 4px; margin: 16px 0; }
.callout-title { font-weight: 600; color: #111; font-size: 14px; margin-bottom: 4px; }
.cta { padding: 24px; background: #111; border-radius: 8px; text-align: center; margin: 24px 0; }
.cta-text { color: #fff; font-size: 16px; margin-bottom: 12px; }
.cta-button { display: inline-block; padding: 12px 24px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; }
.signature { margin-top: 32px; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px; }
</style></head><body>
<div class="wrap">
  <p class="preheader">${esc(data.preheader)}</p>
  <p>${esc(data.greeting)}</p>
  <p>${esc(data.intro)}</p>
  ${(data.sections || []).map(s => `
    <h2>${esc(s.title)}</h2>
    <p>${esc(s.content)}</p>
    ${s.bullets?.length ? `<ul>${s.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
    ${s.stats?.length ? `<div class="stats">${s.stats.map(st => `
      <div class="stat">
        <div class="stat-value">${esc(st.value)}</div>
        <div class="stat-label">${esc(st.label)}</div>
        ${st.change ? `<div class="stat-change-${esc(st.direction || 'up')}">${esc(st.change)}</div>` : ''}
      </div>`).join('')}</div>` : ''}
  `).join('')}
  ${data.callout ? `<div class="callout"><div class="callout-title">${esc(data.callout.title)}</div><p>${esc(data.callout.text)}</p></div>` : ''}
  ${data.cta ? `<div class="cta"><div class="cta-text">${esc(data.cta.text)}</div><a href="${esc(data.cta.buttonUrl)}" class="cta-button">${esc(data.cta.buttonText)}</a></div>` : ''}
  <div class="signature"><p>${esc(data.closing)}</p><p><strong>${esc(data.signature)}</strong></p></div>
</div></body></html>`
  }

  function copyHTMLToClipboard() {
    navigator.clipboard.writeText(buildHTML())
    setCopyHtml(true)
    setTimeout(() => setCopyHtml(false), 1500)
  }

  function downloadHTML() {
    const blob = new Blob([buildHTML()], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-${period.replace(/ /g, '-')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">📧 Newsletter Generator</h1>
          <p className="text-gray-500 text-sm mt-1">Miesięczny mailing dla klienta — highlights, KPI, plany. Eksport do HTML/Mailchimp.</p>
        </div>

        {history.length > 0 && !data && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📚 Ostatnie newslettery ({history.length})</h3>
            <div className="grid grid-cols-3 gap-3">
              {history.slice(0, 6).map(h => (
                <button key={h.id} onClick={() => setData(h.data)}
                  className="text-left p-3 rounded-xl transition-all hover:border-indigo-500/40"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-semibold text-white mb-1">{h.title}</p>
                  {h.subtitle && <p className="text-[11px] text-indigo-400">{h.subtitle}</p>}
                  <p className="text-[10px] text-gray-600 mt-1">{new Date(h.createdAt).toLocaleString('pl', { day: 'numeric', month: 'short' })}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {!data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <label className="label">📅 Okres</label>
                <input className="input" value={period} onChange={e => setPeriod(e.target.value)} />
              </div>
              <div className="card">
                <label className="label">🏢 Nazwa agencji (opcjonalnie)</label>
                <input className="input" value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder="Twoja Agencja Sp. z o.o." />
              </div>
            </div>

            <div className="card">
              <label className="label">📊 KPI (wszystko opcjonalnie)</label>
              <div className="grid grid-cols-4 gap-3">
                <input className="input" placeholder="Zasięg np. 150K +23%" value={reach} onChange={e => setReach(e.target.value)} />
                <input className="input" placeholder="Engagement np. 4.2%" value={engagement} onChange={e => setEngagement(e.target.value)} />
                <input className="input" placeholder="Followers +340" value={followers} onChange={e => setFollowers(e.target.value)} />
                <input className="input" placeholder="Konwersje" value={conversions} onChange={e => setConversions(e.target.value)} />
              </div>
              <textarea className="input mt-3" rows={2} placeholder="Notatki o wynikach: co zaskoczyło, co zadziałało..."
                value={kpiNotes} onChange={e => setKpiNotes(e.target.value)} />
            </div>

            <div className="card">
              <label className="label">🚀 Plany na następny miesiąc</label>
              <textarea className="input" rows={3} value={plans} onChange={e => setPlans(e.target.value)}
                placeholder="Co planujemy: nowa kampania, akcja sezonowa, testy A/B..." />
            </div>

            <div className="card text-xs text-gray-500">
              💡 AI automatycznie użyje danych z {projectDrafts.length} ostatnich postów z tego projektu
            </div>

            {error && <div className="card bg-red-500/5 border-red-500/20 text-red-300 text-sm">{error}</div>}

            <SearchToggle enabled={useSearch} onChange={setUseSearch} disabled={loading} />
            <button onClick={generate} disabled={loading}
              className="btn-primary w-full py-4 text-base disabled:opacity-30">
              {loading ? '⏳ Tworzę newsletter...' : '✨ Wygeneruj newsletter'}
            </button>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Newsletter gotowy</h2>
              <div className="flex gap-2">
                <button onClick={copyHTMLToClipboard} className="btn-secondary text-xs">{copyHtml ? '✓ Skopiowano HTML' : '📋 Kopiuj HTML'}</button>
                <button onClick={downloadHTML} className="btn-secondary text-xs">📥 Pobierz HTML</button>
                <button onClick={() => setData(null)} className="btn-ghost text-xs">+ Nowy</button>
              </div>
            </div>

            <div className="card">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Subject:</p>
              <p className="text-base font-semibold text-white mb-3">{data.subject}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Preheader:</p>
              <p className="text-xs text-gray-400">{data.preheader}</p>
            </div>

            {/* Email preview */}
            <div className="card overflow-hidden p-0">
              <iframe srcDoc={buildHTML()} className="w-full" style={{ height: '800px', background: 'white', border: 0 }} title="preview" />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
