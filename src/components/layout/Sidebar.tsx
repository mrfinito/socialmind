'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { usePermissions } from '@/lib/usePermissions'
import { createClient } from '@/lib/supabase'

export default function Sidebar() {
  const path = usePathname()
  const { activeProject, state } = useStore()
  const { perms } = usePermissions()

  const NAV_GROUPS = [
    {
      label: 'Główne',
      items: [
        { href: '/',           icon: '⊞', label: 'Pulpit' },
        { href: '/strategia', icon: '🧭', label: 'Strategia', show: true },
        { href: '/rtm',      icon: '⚡', label: 'RTM Generator', show: true },
        { href: '/asystent', icon: '🤖', label: 'Asystent AI', show: true },
        { href: '/brief',    icon: '📋', label: 'Briefy klientów', show: true },
        { href: '/wlasny-brief', icon: '📂', label: 'Własny brief', show: true },
        perms.can_generate_posts && { href: '/generuj',    icon: '✦', label: 'Generuj posty' },
        { href: '/biblioteka', icon: '📚', label: 'Biblioteka' },
        { href: '/scheduler',  icon: '📅', label: 'Scheduler' },
        { href: '/kalendarz',  icon: '⊟', label: 'Kalendarz' },
        { href: '/analityka',  icon: '⊘', label: 'Analityka' },
        perms.can_raport && { href: '/raport', icon: '📈', label: 'Raport' },
      ].filter(Boolean)
    },
    {
      label: 'Marka',
      items: [
        { href: '/marka',     icon: '◈', label: 'Marka' },
        { href: '/brand-dna', icon: '◉', label: 'Brand DNA' },
        { href: '/platformy', icon: '⊹', label: 'Platformy' },
        { href: '/materialy', icon: '⊡', label: 'Materiały' },
        { href: '/projekty',  icon: '🗂', label: 'Projekty' },
      ]
    },
    {
      label: 'AI Tools',
      items: [
        perms.can_copywriter     && { href: '/copywriter',    icon: '✍️', label: 'AI Copywriter',     badge: 'NEW' },
        perms.can_content_score  && { href: '/content-score', icon: '📊', label: 'Content Score',     badge: 'NEW' },
        perms.can_kampania       && { href: '/kampania',      icon: '🚀', label: 'Kampania 360°' },
        perms.can_persona        && { href: '/persona',       icon: '👤', label: 'Persona Builder' },
        perms.can_listening      && { href: '/listening',     icon: '🎙', label: 'Social Listening' },
        perms.can_wideo          && { href: '/wideo',         icon: '🎬', label: 'Skrypty wideo' },
        perms.can_trendy         && { href: '/trendy',        icon: '📡', label: 'Trendy' },
        perms.can_competitor     && { href: '/konkurencja',   icon: '🔍', label: 'Konkurencja' },
        perms.can_repurposing    && { href: '/repurposing',   icon: '♻️', label: 'Smart Repurposing' },
        perms.can_ab_testy       && { href: '/ab-testy',      icon: '🧪', label: 'Testy A/B' },
      ].filter(Boolean)
    },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] flex flex-col z-20 overflow-y-auto"
      style={{background:'#0d1018',borderRight:'1px solid rgba(255,255,255,0.06)'}}>
      {/* Logo */}
      <div className="px-5 py-4 shrink-0" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center"
            style={{boxShadow:'0 0 12px rgba(99,102,241,0.4)'}}>
            <span className="text-white text-sm font-bold">✦</span>
          </div>
          <span className="font-semibold text-white text-sm tracking-tight">SocialMind</span>
        </div>
        {/* Active project pill */}
        {activeProject && (
          <Link href="/projekty"
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all hover:bg-white/5"
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <span className="text-base shrink-0">{activeProject.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-300 truncate">{activeProject.name}</p>
              <p className="text-[9px] text-gray-600">{state.projects.length} projekt{state.projects.length===1?'':'ów'}</p>
            </div>
            <span className="text-gray-700 text-[10px]">▼</span>
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest px-3 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {(group.items as {href:string;icon:string;label:string;badge?:string}[]).map(item => {
                const active = path === item.href
                return (
                  <Link key={item.href} href={item.href}
                    className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}>
                    <span className="text-base w-5 text-center leading-none shrink-0">{item.icon}</span>
                    <span className="flex-1 text-sm">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{background:'rgba(99,102,241,0.2)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.3)'}}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 shrink-0" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
        <Link href="/admin" className={`sidebar-link ${path==='/admin'?'sidebar-link-active':''} mb-1`}>
          <span className="text-base w-5 text-center">⚙️</span>
          <span className="text-sm">Panel admina</span>
        </Link>
        <Link href="/ustawienia" className={`sidebar-link ${path==='/ustawienia'?'sidebar-link-active':''} mb-1`}>
          <span className="text-base w-5 text-center">⊛</span>
          <span className="text-sm">Ustawienia</span>
        </Link>
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
            style={{background:'linear-gradient(135deg,#6366f1,#a855f7)'}}>
            {state.user?.name?.[0]?.toUpperCase() || state.user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-300 truncate">
              {state.user?.name || state.user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-[10px] text-gray-600 truncate">{state.user?.email || ''}</p>
          </div>
          <button
            onClick={async () => { const sb = createClient(); await sb.auth.signOut(); window.location.href = '/login' }}
            className="text-gray-700 hover:text-gray-400 transition-colors text-sm" title="Wyloguj">
            ⎋
          </button>
        </div>
      </div>
    </aside>
  )
}
