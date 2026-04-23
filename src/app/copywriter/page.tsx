'use client'
import { useState, useRef, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { PLATFORMS } from '@/lib/types'
import type { Platform } from '@/lib/types'
import PlatformIcon from '@/components/PlatformIcon'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

const QUICK_PROMPTS = [
  'Napisz post o naszej ofercie na ten tydzień',
  'Zrób 3 warianty hooka do posta',
  'Skróć ostatni tekst do twitta',
  'Dodaj więcej emocji do tego posta',
  'Napisz post edukacyjny dla naszej branży',
  'Zrób wersję storytellingową',
  'Napisz CTA które zachęca do kontaktu',
  'Zrób karuzelę — 5 slajdów z tym tematem',
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0,1,2].map(i => (
        <span key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
          style={{animationDelay:`${i*0.15}s`}}/>
      ))}
    </div>
  )
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

export default function CopywriterPage() {
  const { dna, activeProject } = useStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<number|null>(null)
  const [showPlatforms, setShowPlatforms] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: dna
          ? `Cześć! Jestem Twoim AI Copywriterem dla marki **${dna.brandName || activeProject?.name}**.\n\nZnam Twoje Brand DNA — ton, persony, wartości. Powiedz mi co napisać, a dostosowuję do Twojej marki automatycznie.\n\nNa przykład: *"Napisz post o naszej rekrutacji na wrzesień"* albo *"Zrób 3 warianty hooka o edukacji dwujęzycznej"*`
          : `Cześć! Jestem Twoim AI Copywriterem.\n\nMożesz mi powiedzieć co napisać — post, hook, karuzela, CTA. Dostosowuję tekst do platformy którą wybierzesz.\n\n💡 Tip: Dodaj Brand DNA w ustawieniach marki żeby AI pisał dokładnie w Twoim tonie.`,
        ts: Date.now()
      }])
    }
  }, [])

  async function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: msg, ts: Date.now() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/copywriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          dna, platform,
        })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setMessages(prev => [...prev, { role: 'assistant', content: j.text, ts: Date.now() }])
    } catch (e: unknown) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Błąd: ${e instanceof Error ? e.message : 'Spróbuj ponownie'}`,
        ts: Date.now()
      }])
    } finally { setLoading(false) }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function handleCopy(content: string, idx: number) {
    copyToClipboard(content)
    setCopied(idx); setTimeout(() => setCopied(null), 1500)
  }

  function clearChat() {
    setMessages([])
    setTimeout(() => {
      setMessages([{
        role: 'assistant',
        content: 'Nowa rozmowa — gotowy do pisania! Co przygotowuję?',
        ts: Date.now()
      }])
    }, 100)
  }

  const currentPlatform = PLATFORMS.find(p => p.id === platform)

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-0px)]" style={{height:'calc(100vh - 0px)'}}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between shrink-0"
          style={{borderBottom:'1px solid rgba(255,255,255,0.06)',background:'#0f1117'}}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{background:'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(168,85,247,0.2))',border:'1px solid rgba(99,102,241,0.3)'}}>
              <span className="text-lg">✍️</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">AI Copywriter</h1>
              <p className="text-[11px] text-gray-500">
                {dna ? `Brand DNA: ${dna.brandName || activeProject?.name}` : 'Bez Brand DNA'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Platform selector */}
            <div className="relative">
              <button onClick={() => setShowPlatforms(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <PlatformIcon platform={platform} size={18}/>
                <span className="text-gray-300 text-xs">{currentPlatform?.name}</span>
                <span className="text-gray-600 text-xs">▼</span>
              </button>
              {showPlatforms && (
                <div className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-xl"
                  style={{background:'#1a1f2e',border:'1px solid rgba(255,255,255,0.08)',minWidth:160}}>
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => { setPlatform(p.id as Platform); setShowPlatforms(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-white/5 transition-all text-left"
                      style={{color: platform===p.id ? '#a5b4fc' : '#9ca3af'}}>
                      <PlatformIcon platform={p.id} size={18}/>
                      {p.name}
                      {platform===p.id && <span className="ml-auto text-indigo-400 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={clearChat} className="btn-ghost text-xs px-3 py-2">🗑 Wyczyść</button>
          </div>
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="px-6 py-3 flex gap-2 flex-wrap shrink-0"
            style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => send(p)}
                className="text-xs px-3 py-1.5 rounded-full transition-all hover:border-indigo-500/40 hover:text-indigo-300"
                style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',color:'#6b7280'}}>
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 mr-2"
                  style={{background:'linear-gradient(135deg,rgba(99,102,241,0.4),rgba(168,85,247,0.3))',border:'1px solid rgba(99,102,241,0.3)'}}>
                  <span className="text-xs">✦</span>
                </div>
              )}
              <div className={`max-w-[75%] group relative`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'text-white rounded-tr-sm'
                    : 'text-gray-200 rounded-tl-sm'
                }`}
                  style={{
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg,rgba(99,102,241,0.35),rgba(168,85,247,0.25))'
                      : 'rgba(255,255,255,0.04)',
                    border: msg.role === 'user'
                      ? '1px solid rgba(99,102,241,0.4)'
                      : '1px solid rgba(255,255,255,0.07)',
                  }}>
                  {msg.content}
                </div>
                {msg.role === 'assistant' && (
                  <button onClick={() => handleCopy(msg.content, i)}
                    className="absolute -bottom-1 right-0 opacity-0 group-hover:opacity-100 transition-all text-[10px] px-2 py-0.5 rounded-lg"
                    style={{background:'rgba(99,102,241,0.2)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.3)'}}>
                    {copied === i ? '✓' : 'Kopiuj'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 mr-2"
                style={{background:'linear-gradient(135deg,rgba(99,102,241,0.4),rgba(168,85,247,0.3))',border:'1px solid rgba(99,102,241,0.3)'}}>
                <span className="text-xs">✦</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
                <TypingDots/>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div className="px-6 py-4 shrink-0" style={{borderTop:'1px solid rgba(255,255,255,0.06)',background:'#0f1117'}}>
          {dna && (
            <div className="flex items-center gap-2 mb-3 text-[11px] text-indigo-400/70">
              <span>🧬</span>
              <span>Piszę w tonie: <strong>{dna.tone || 'profesjonalny'}</strong> dla marki <strong>{dna.brandName}</strong> na <strong>{currentPlatform?.name}</strong></span>
            </div>
          )}
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              className="flex-1 input resize-none text-sm"
              style={{minHeight:48,maxHeight:160}}
              placeholder={`Napisz co przygotować... (Enter = wyślij, Shift+Enter = nowa linia)`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
            />
            <button onClick={() => send()} disabled={loading || !input.trim()}
              className="btn-primary px-5 py-3 shrink-0 flex items-center gap-2 disabled:opacity-40"
              style={{height:48}}>
              {loading ? '...' : '→'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
