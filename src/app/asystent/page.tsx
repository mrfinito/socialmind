'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { historyLoad } from '@/lib/history'

interface ChatMessage { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  { icon: '📅', text: 'Co opublikować jutro na Facebooku?' },
  { icon: '💡', text: 'Pomóż mi zaplanować kampanię na przyszły miesiąc' },
  { icon: '🎯', text: 'Jak zwiększyć zaangażowanie na Instagramie?' },
  { icon: '⚠️', text: 'Jak zareagować na negatywny komentarz?' },
  { icon: '📊', text: 'Zinterpretuj moje wyniki z ostatniego miesiąca' },
  { icon: '✨', text: 'Podaj 5 pomysłów na posty edukacyjne' },
]

function Dots() {
  return <span className="inline-flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span>
}

export default function AsystentPage() {
  const { dna, activeProject, projectDrafts } = useStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [projectContext, setProjectContext] = useState<{ strategy?: unknown; recentRtm?: unknown }>({})

  useEffect(() => {
    const projectId = activeProject?.id || 'default'
    const strategyHist = historyLoad('strategia', projectId)
    const rtmHist = historyLoad('rtm', projectId)
    setProjectContext({
      strategy: strategyHist[0]?.data,
      recentRtm: rtmHist[0]?.data,
    })
  }, [activeProject])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  async function send(text?: string) {
    const content = (text || input).trim()
    if (!content || loading) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setStreaming('')

    try {
      const context = {
        brandName: dna?.brandName,
        industry: dna?.industry,
        dna,
        recentPosts: projectDrafts?.slice(0, 5),
        strategy: projectContext.strategy,
        recentRtm: projectContext.recentRtm,
      }

      const res = await fetch('/api/asystent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context }),
      })

      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error)
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('Brak streamu')

      let buffer = ''
      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.chunk) {
              accumulated += parsed.chunk
              setStreaming(accumulated)
            }
            if (parsed.done) {
              setMessages(prev => [...prev, { role: 'assistant', content: parsed.fullText || accumulated }])
              setStreaming('')
            }
            if (parsed.error) throw new Error(parsed.error)
          } catch {}
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Błąd: ' + (e instanceof Error ? e.message : 'nieznany') }])
    } finally {
      setLoading(false)
      setStreaming('')
    }
  }

  function clearChat() {
    if (confirm('Wyczyścić rozmowę?')) setMessages([])
  }

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-60px)]">
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <span className="text-2xl">🤖</span> Asystent strategiczny
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {dna?.brandName
                ? `Znam kontekst projektu: ${dna.brandName} · ${dna.industry}`
                : 'Zapytaj o cokolwiek związanego z komunikacją marki'}
            </p>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} className="btn-ghost text-xs">🗑 Wyczyść</button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <p className="text-5xl mb-4">💬</p>
                <h2 className="text-2xl font-bold text-white mb-2">Jak mogę pomóc?</h2>
                <p className="text-gray-500 text-sm">
                  Mam dostęp do Twojego Brand DNA, strategii, ostatnich postów i RTM. Zapytaj o konkretne rekomendacje.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s.text)}
                    className="text-left p-4 rounded-xl transition-all hover:border-indigo-500/40"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xl mb-2">{s.icon}</p>
                    <p className="text-sm text-gray-300">{s.text}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                      style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
                      🤖
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-indigo-500' : ''}`}
                    style={m.role === 'assistant' ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' } : undefined}>
                    <p className={`text-sm whitespace-pre-wrap ${m.role === 'user' ? 'text-white' : 'text-gray-200'} leading-relaxed`}>
                      {m.content}
                    </p>
                  </div>
                  {m.role === 'user' && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
                      style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                      JA
                    </div>
                  )}
                </div>
              ))}

              {streaming && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                    style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
                    🤖
                  </div>
                  <div className="max-w-[75%] rounded-2xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{streaming}<span className="inline-block w-1.5 h-4 bg-indigo-400 ml-1 animate-pulse" /></p>
                  </div>
                </div>
              )}

              {loading && !streaming && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                    style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
                    🤖
                  </div>
                  <div className="rounded-2xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Dots />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-8 py-4 border-t border-white/5">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                }}
                placeholder={loading ? 'Asystent odpowiada...' : 'Zadaj pytanie...'}
                disabled={loading}
                rows={1}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500 outline-none resize-none"
                style={{ minHeight: 48, maxHeight: 120 }}
              />
              <button onClick={() => send()} disabled={loading || !input.trim()}
                className="px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-30 transition-all"
                style={{ background: '#6366f1', color: 'white' }}>
                {loading ? <Dots /> : 'Wyślij'}
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-2 text-center">
              Asystent zna kontekst Twojej marki · Enter = wyślij · Shift+Enter = nowa linia
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
