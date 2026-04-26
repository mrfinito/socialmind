'use client'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('sm:theme') as 'dark' | 'light' | null) || 'dark'
      setTheme(saved)
      document.body.classList.toggle('light-mode', saved === 'light')
      // Remove the preload helper class once React takes over
      document.documentElement.classList.remove('preload-light')
      setMounted(true)
    } catch {
      setMounted(true)
    }

    // Listen to changes from other parts of the app (e.g. settings page)
    const onChange = (e: Event) => {
      const next = (e as CustomEvent).detail as 'dark' | 'light'
      if (next === 'dark' || next === 'light') {
        setTheme(next)
        document.body.classList.toggle('light-mode', next === 'light')
      }
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'sm:theme' && e.newValue) {
        const next = e.newValue as 'dark' | 'light'
        setTheme(next)
        document.body.classList.toggle('light-mode', next === 'light')
      }
    }
    window.addEventListener('sm-theme-changed', onChange as EventListener)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('sm-theme-changed', onChange as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.body.classList.toggle('light-mode', next === 'light')
    try { localStorage.setItem('sm:theme', next) } catch {}
    window.dispatchEvent(new CustomEvent('sm-theme-changed', { detail: next }))
  }

  if (!mounted) {
    // Prevent hydration mismatch — render placeholder
    return <div style={{ height: 36 }} />
  }

  return (
    <button onClick={toggle}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs transition-all hover:opacity-80"
      style={{
        background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
        color: theme === 'dark' ? '#9ca3af' : '#4b5563',
      }}
      title={theme === 'dark' ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}>
      {theme === 'dark' ? '☀️ Jasny motyw' : '🌙 Ciemny motyw'}
    </button>
  )
}
