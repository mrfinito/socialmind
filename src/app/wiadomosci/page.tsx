'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase'

interface ChatMessage {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read_at: string | null
  created_at: string
}

interface AdminInfo {
  id: string
  email: string
}

export default function WiadomosciPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [admins, setAdmins] = useState<AdminInfo[]>([])
  const [activeAdminId, setActiveAdminId] = useState<string>('')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      setCurrentUserId(user.id)
      
      // Find admins user has chatted with
      const { data: msgs } = await supabase
        .from('admin_messages')
        .select('sender_id, recipient_id')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      
      const partnerIds = new Set<string>()
      msgs?.forEach(m => {
        if (m.sender_id !== user.id) partnerIds.add(m.sender_id)
        if (m.recipient_id !== user.id) partnerIds.add(m.recipient_id)
      })
      
      // Get admin info
      if (partnerIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', Array.from(partnerIds))
        if (!cancelled) {
          const adminList = (profiles || []) as AdminInfo[]
          setAdmins(adminList)
          if (adminList.length > 0) setActiveAdminId(adminList[0].id)
        }
      }
      if (!cancelled) setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!activeAdminId) return
    let cancelled = false
    
    async function loadMessages() {
      const res = await fetch(`/api/admin/chat?with=${activeAdminId}`)
      const j = await res.json()
      if (!cancelled && j.ok) setMessages(j.messages)
    }
    loadMessages()
    const interval = setInterval(loadMessages, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [activeAdminId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || sending || !activeAdminId) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: activeAdminId, content: input.trim() })
      })
      const j = await res.json()
      if (j.ok && j.message) {
        setMessages(prev => [...prev, j.message])
        setInput('')
      }
    } finally { setSending(false) }
  }

  if (loading) {
    return <AppShell><div className="px-8 py-8 text-gray-500">Ładowanie...</div></AppShell>
  }

  if (admins.length === 0) {
    return (
      <AppShell>
        <div className="px-8 py-12 text-center max-w-2xl mx-auto">
          <p className="text-5xl mb-4">📬</p>
          <h1 className="text-2xl font-bold text-white mb-2">Brak wiadomości</h1>
          <p className="text-gray-500 text-sm">
            Tutaj zobaczysz wiadomości od administratora SocialMind. Zostaniesz powiadomiony gdy admin do Ciebie napisze.
          </p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-60px)]">
        <div className="w-72 shrink-0" style={{ background: '#0a0d14', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="p-4 border-b border-white/5">
            <h1 className="text-lg font-semibold text-white">📬 Wiadomości</h1>
          </div>
          <div className="overflow-y-auto p-2 space-y-1">
            {admins.map(a => (
              <button key={a.id} onClick={() => setActiveAdminId(a.id)}
                className="w-full text-left p-3 rounded-lg transition-all"
                style={{
                  background: a.id === activeAdminId ? 'rgba(99,102,241,0.15)' : 'transparent',
                  border: a.id === activeAdminId ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                }}>
                <p className="text-xs font-medium text-white truncate">{a.email}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Administrator</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map(m => {
              const isMine = m.sender_id === currentUserId
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[70%] rounded-2xl px-4 py-2.5"
                    style={{
                      background: isMine ? '#6366f1' : 'rgba(255,255,255,0.06)',
                      border: isMine ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-white">{m.content}</p>
                    <p className="text-[10px] mt-1" style={{ color: isMine ? 'rgba(255,255,255,0.7)' : '#6b7280' }}>
                      {new Date(m.created_at).toLocaleString('pl', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef}/>
          </div>
          <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex gap-2">
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Napisz wiadomość do administratora..."
                rows={1}
                className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500 outline-none resize-none" />
              <button onClick={send} disabled={sending || !input.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-30"
                style={{ background: '#6366f1', color: 'white' }}>
                {sending ? '...' : 'Wyślij'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
