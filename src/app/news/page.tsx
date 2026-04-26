'use client'
import { useState, useEffect, useMemo } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { RSS_SOURCES, CATEGORIES } from '@/lib/rssSources'

interface NewsItem {
  id: string
  title: string
  link: string
  description: string
  pubDate: string
  source: string
  sourceId: string
  category: string
}

interface InsightData {
  relevance: number
  summary: string
  whyItMatters: string
  implications: string[]
  actions: { immediate: string[]; shortTerm: string[]; strategic: string[] }
  contentIdeas: Array<{ format: string; title: string; angle: string; hook: string }>
  risks: string[]
  tags: string[]
}

interface SavedItem {
  id: string
  article: NewsItem
  insight?: InsightData
  savedAt: string
  note?: string
}

interface CustomSource {
  id: string
  name: string
  rss: string
  addedAt: string
}

const FAVORITES_KEY = 'sm:news:favorites'
const SOURCES_KEY = 'sm:news:sources'
const CUSTOM_SOURCES_KEY = 'sm:news:custom-sources'
const INSIGHTS_KEY = 'sm:news:insights'

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback } catch { return fallback }
}

function saveJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

function timeAgo(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = now - then
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (min < 1) return 'teraz'
  if (min < 60) return `${min} min temu`
  if (hr < 24) return `${hr} godz. temu`
  if (day < 7) return `${day} dni temu`
  return new Date(iso).toLocaleDateString('pl', { day: 'numeric', month: 'short' })
}

export default function NewsPage() {
  const { dna, activeProject } = useStore()
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeCat, setActiveCat] = useState<string>('marketing')
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [customSources, setCustomSources] = useState<CustomSource[]>([])
  const [favorites, setFavorites] = useState<SavedItem[]>([])
  const [insights, setInsights] = useState<Record<string, InsightData>>({})
  const [insightLoading, setInsightLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'feed' | 'favorites' | 'sources'>('feed')
  const [showSourceModal, setShowSourceModal] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')
  const [newSourceRss, setNewSourceRss] = useState('')
  const [lastFetch, setLastFetch] = useState<string>('')
  const [failedSources, setFailedSources] = useState<string[]>([])

  // Load saved state
  useEffect(() => {
    setSelectedSources(loadJSON<string[]>(SOURCES_KEY, ['wirtualne-media', 'nowy-marketing', 'press-pl', 'marketingibiznes']))
    setCustomSources(loadJSON<CustomSource[]>(CUSTOM_SOURCES_KEY, []))
    setFavorites(loadJSON<SavedItem[]>(FAVORITES_KEY, []))
    setInsights(loadJSON<Record<string, InsightData>>(INSIGHTS_KEY, {}))
  }, [])

  // Persist
  useEffect(() => { saveJSON(SOURCES_KEY, selectedSources) }, [selectedSources])
  useEffect(() => { saveJSON(CUSTOM_SOURCES_KEY, customSources) }, [customSources])
  useEffect(() => { saveJSON(FAVORITES_KEY, favorites) }, [favorites])
  useEffect(() => { saveJSON(INSIGHTS_KEY, insights) }, [insights])

  async function fetchNews() {
    if (selectedSources.length === 0 && customSources.length === 0) {
      setError('Wybierz przynajmniej jedno źródło w zakładce "Źródła"')
      return
    }
    setLoading(true); setError(''); setFailedSources([])
    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceIds: selectedSources,
          customSources: customSources.map(c => ({ name: c.name, rss: c.rss })),
          limit: 100,
        })
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setItems(j.items || [])
      setLastFetch(new Date().toISOString())
      setFailedSources(j.failed || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch on mount when sources are ready
  useEffect(() => {
    if (selectedSources.length > 0 || customSources.length > 0) {
      fetchNews()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generateInsight(article: NewsItem) {
    if (insights[article.id]) return // already have it
    setInsightLoading(article.id)
    try {
      const res = await fetch('/api/news-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: { title: article.title, description: article.description, link: article.link, source: article.source, pubDate: article.pubDate },
          dna,
          projectName: activeProject?.name,
        })
      })
      const j = await res.json()
      if (j.ok && j.data) {
        setInsights(prev => ({ ...prev, [article.id]: j.data }))
      } else {
        alert(j.error || 'Błąd generowania insightu')
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setInsightLoading(null)
    }
  }

  function toggleFavorite(article: NewsItem) {
    const existing = favorites.find(f => f.id === article.id)
    if (existing) {
      setFavorites(prev => prev.filter(f => f.id !== article.id))
    } else {
      setFavorites(prev => [{
        id: article.id,
        article,
        insight: insights[article.id],
        savedAt: new Date().toISOString(),
      }, ...prev])
    }
  }

  function isFavorite(id: string): boolean {
    return favorites.some(f => f.id === id)
  }

  function addCustomSource() {
    if (!newSourceRss.trim() || !newSourceRss.startsWith('http')) {
      alert('Podaj poprawny URL feeda RSS (np. https://example.com/rss)')
      return
    }
    const newSrc: CustomSource = {
      id: 'custom-' + Date.now(),
      name: newSourceName.trim() || new URL(newSourceRss).hostname,
      rss: newSourceRss.trim(),
      addedAt: new Date().toISOString(),
    }
    setCustomSources(prev => [newSrc, ...prev])
    setNewSourceName(''); setNewSourceRss(''); setShowSourceModal(false)
  }

  function removeCustomSource(id: string) {
    setCustomSources(prev => prev.filter(s => s.id !== id))
  }

  function toggleSource(id: string) {
    setSelectedSources(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  function selectCategorySources(category: string) {
    const ids = RSS_SOURCES.filter(s => s.category === category).map(s => s.id)
    const allSelected = ids.every(id => selectedSources.includes(id))
    if (allSelected) {
      setSelectedSources(prev => prev.filter(id => !ids.includes(id)))
    } else {
      setSelectedSources(prev => Array.from(new Set([...prev, ...ids])))
    }
  }

  // Filtering
  const filteredItems = useMemo(() => {
    let list = items
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
    }
    return list
  }, [items, search])

  const sourcesByCategory = useMemo(() => {
    const map: Record<string, typeof RSS_SOURCES> = {}
    RSS_SOURCES.forEach(s => {
      if (!map[s.category]) map[s.category] = []
      map[s.category].push(s)
    })
    return map
  }, [])

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-6xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">📰 Wiadomości branżowe</h1>
            <p className="text-gray-500 text-sm mt-1">Najnowsze artykuły z portali branżowych + AI insighty dla Twoich klientów</p>
          </div>
          {view === 'feed' && (
            <button onClick={fetchNews} disabled={loading}
              className="btn-secondary text-sm disabled:opacity-30">
              {loading ? '⏳ Pobieram...' : '↻ Odśwież'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/5">
          <button onClick={() => setView('feed')}
            className="px-4 py-2 text-sm transition-all"
            style={{
              borderBottom: view === 'feed' ? '2px solid #6366f1' : '2px solid transparent',
              color: view === 'feed' ? '#a5b4fc' : '#9ca3af',
            }}>
            📰 Feed ({items.length})
          </button>
          <button onClick={() => setView('favorites')}
            className="px-4 py-2 text-sm transition-all"
            style={{
              borderBottom: view === 'favorites' ? '2px solid #6366f1' : '2px solid transparent',
              color: view === 'favorites' ? '#a5b4fc' : '#9ca3af',
            }}>
            ⭐ Zapisane ({favorites.length})
          </button>
          <button onClick={() => setView('sources')}
            className="px-4 py-2 text-sm transition-all"
            style={{
              borderBottom: view === 'sources' ? '2px solid #6366f1' : '2px solid transparent',
              color: view === 'sources' ? '#a5b4fc' : '#9ca3af',
            }}>
            📚 Źródła ({selectedSources.length + customSources.length})
          </button>
        </div>

        {/* FEED VIEW */}
        {view === 'feed' && (
          <>
            {error && (
              <div className="card bg-red-500/5 border-red-500/20 text-red-300 text-sm mb-4">{error}</div>
            )}

            {failedSources.length > 0 && (
              <div className="card bg-yellow-500/5 border-yellow-500/20 text-yellow-300 text-sm mb-4">
                ⚠️ Nie udało się pobrać z: {failedSources.join(', ')}. Sprawdź czy RSS jest aktywny.
              </div>
            )}

            <div className="mb-4">
              <input className="input"
                placeholder="🔍 Szukaj w artykułach..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {lastFetch && (
              <p className="text-[11px] text-gray-600 mb-4">Ostatnio pobrane: {new Date(lastFetch).toLocaleString('pl')} · {filteredItems.length} z {items.length} artykułów</p>
            )}

            {loading && items.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-3xl mb-2">⏳</p>
                <p className="text-sm text-gray-400">Pobieram artykuły z {selectedSources.length + customSources.length} źródeł...</p>
              </div>
            ) : items.length === 0 && !loading ? (
              <div className="card text-center py-12">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-base text-white mb-2">Brak artykułów</p>
                <p className="text-xs text-gray-500 mb-4">Wybierz źródła w zakładce &quot;Źródła&quot; i kliknij Odśwież</p>
                <button onClick={() => setView('sources')} className="btn-primary text-sm">
                  📚 Wybierz źródła
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map(item => {
                  const insight = insights[item.id]
                  const fav = isFavorite(item.id)
                  return (
                    <div key={item.id} className="card">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-medium">{item.source}</span>
                            <span className="text-[10px] text-gray-600">·</span>
                            <span className="text-[10px] text-gray-600">{timeAgo(item.pubDate)}</span>
                            {insight && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded ml-auto"
                                style={{
                                  background: insight.relevance >= 70 ? 'rgba(16,185,129,0.15)' : insight.relevance >= 40 ? 'rgba(251,191,36,0.15)' : 'rgba(156,163,175,0.15)',
                                  color: insight.relevance >= 70 ? '#6ee7b7' : insight.relevance >= 40 ? '#fbbf24' : '#9ca3af',
                                }}>
                                {insight.relevance}% relevant
                              </span>
                            )}
                          </div>
                          <a href={item.link} target="_blank" rel="noopener noreferrer"
                            className="text-base font-semibold text-white hover:text-indigo-300 transition-colors block leading-snug mb-1">
                            {item.title}
                          </a>
                          {item.description && (
                            <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{item.description}</p>
                          )}
                        </div>
                        <button onClick={() => toggleFavorite(item)}
                          title={fav ? 'Usuń z zapisanych' : 'Zapisz'}
                          className="text-2xl transition-all hover:scale-110">
                          {fav ? '⭐' : '☆'}
                        </button>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <a href={item.link} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-all">
                          📖 Czytaj artykuł →
                        </a>
                        {!insight ? (
                          <button onClick={() => generateInsight(item)}
                            disabled={insightLoading === item.id}
                            className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-30 transition-all"
                            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                            {insightLoading === item.id ? '⏳ AI analizuje...' : '✨ Insight AI'}
                          </button>
                        ) : (
                          <span className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7' }}>
                            ✓ Insight gotowy
                          </span>
                        )}
                      </div>

                      {insight && (
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-indigo-400 mb-1">📋 Streszczenie</p>
                            <p className="text-sm text-gray-300">{insight.summary}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">💡 Dlaczego to ważne dla {activeProject?.name || 'marki'}</p>
                            <p className="text-sm text-gray-300">{insight.whyItMatters}</p>
                          </div>
                          {insight.implications?.length > 0 && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-purple-400 mb-1">🎯 Implikacje</p>
                              <ul className="space-y-1">
                                {insight.implications.map((imp, i) => (
                                  <li key={i} className="text-xs text-gray-400 flex gap-2">
                                    <span className="text-purple-400">→</span>
                                    <span>{imp}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {insight.contentIdeas?.length > 0 && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-orange-400 mb-2">✍️ Pomysły na content</p>
                              <div className="grid grid-cols-2 gap-2">
                                {insight.contentIdeas.slice(0, 4).map((idea, i) => (
                                  <div key={i} className="p-2.5 rounded-lg" style={{ background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.15)' }}>
                                    <p className="text-[10px] uppercase text-orange-400 mb-1">{idea.format}</p>
                                    <p className="text-xs font-medium text-white mb-1">{idea.title}</p>
                                    {idea.hook && <p className="text-[11px] text-gray-400 italic">&ldquo;{idea.hook}&rdquo;</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {(insight.actions?.immediate?.length || 0) > 0 && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-yellow-400 mb-1">⚡ Działania od razu</p>
                              <ul className="space-y-1">
                                {insight.actions.immediate.map((a, i) => (
                                  <li key={i} className="text-xs text-gray-400 flex gap-2">
                                    <span className="text-yellow-400">•</span>
                                    <span>{a}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {insight.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {insight.tags.map((t, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300">#{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* FAVORITES VIEW */}
        {view === 'favorites' && (
          <div className="space-y-3">
            {favorites.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-3xl mb-3">⭐</p>
                <p className="text-base text-white mb-2">Brak zapisanych artykułów</p>
                <p className="text-xs text-gray-500">Klikaj ☆ przy artykułach żeby je zapisywać</p>
              </div>
            ) : favorites.map(fav => (
              <div key={fav.id} className="card">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-medium">{fav.article.source}</span>
                      <span className="text-[10px] text-gray-600">· zapisany {timeAgo(fav.savedAt)}</span>
                    </div>
                    <a href={fav.article.link} target="_blank" rel="noopener noreferrer"
                      className="text-base font-semibold text-white hover:text-indigo-300 block leading-snug mb-1">
                      {fav.article.title}
                    </a>
                    {fav.article.description && (
                      <p className="text-sm text-gray-400 line-clamp-2">{fav.article.description}</p>
                    )}
                    {fav.insight && (
                      <p className="text-xs text-emerald-400 mt-2">✓ Z insightem AI · {fav.insight.relevance}% relevant</p>
                    )}
                  </div>
                  <button onClick={() => toggleFavorite(fav.article)}
                    className="text-2xl transition-all hover:scale-110">⭐</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SOURCES VIEW */}
        {view === 'sources' && (
          <div className="space-y-5">
            <div className="card flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Wybrane: {selectedSources.length} predefiniowanych + {customSources.length} własnych</p>
                <p className="text-xs text-gray-500 mt-0.5">Wybierz portale z których chcesz dostawać newsy</p>
              </div>
              <button onClick={() => setShowSourceModal(true)} className="btn-primary text-sm">
                + Dodaj własny RSS
              </button>
            </div>

            {/* Custom sources */}
            {customSources.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3">🔗 Własne źródła</h3>
                <div className="space-y-2">
                  {customSources.map(cs => (
                    <div key={cs.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{cs.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{cs.rss}</p>
                      </div>
                      <button onClick={() => removeCustomSource(cs.id)}
                        className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-500/10">🗑</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Predefined sources by category */}
            {Object.entries(CATEGORIES).map(([catId, cat]) => {
              const sources = sourcesByCategory[catId] || []
              if (sources.length === 0) return null
              const allSelected = sources.every(s => selectedSources.includes(s.id))
              const anySelected = sources.some(s => selectedSources.includes(s.id))
              return (
                <div key={catId} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                      <span className="text-[10px] text-gray-500">({sources.filter(s => selectedSources.includes(s.id)).length}/{sources.length})</span>
                    </h3>
                    <button onClick={() => selectCategorySources(catId)}
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: anySelected && !allSelected ? '#fbbf24' : allSelected ? '#9ca3af' : '#a5b4fc' }}>
                      {allSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {sources.map(s => {
                      const checked = selectedSources.includes(s.id)
                      return (
                        <label key={s.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all hover:bg-white/5"
                          style={{
                            background: checked ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                            border: checked ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.05)',
                          }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleSource(s.id)} />
                          <span className="text-sm text-white">{s.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add custom source modal */}
      {showSourceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          onClick={() => setShowSourceModal(false)}>
          <div className="rounded-2xl w-full max-w-lg p-6"
            style={{ background: '#0f1423', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Dodaj źródło RSS</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nazwa (opcjonalnie)</label>
                <input className="input" value={newSourceName} onChange={e => setNewSourceName(e.target.value)}
                  placeholder="np. Mój ulubiony blog" />
              </div>
              <div>
                <label className="label">URL feedu RSS *</label>
                <input className="input" value={newSourceRss} onChange={e => setNewSourceRss(e.target.value)}
                  placeholder="https://example.com/rss" />
                <p className="text-[10px] text-gray-600 mt-1">
                  Większość blogów ma RSS na /rss, /feed lub /feed.xml. Możesz też wkleić URL i sprawdzić czy działa.
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowSourceModal(false)} className="btn-secondary text-sm">Anuluj</button>
                <button onClick={addCustomSource} className="btn-primary text-sm">Dodaj</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
