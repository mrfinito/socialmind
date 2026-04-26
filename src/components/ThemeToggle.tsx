'use client'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark'|'light'>('dark')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sm:theme') as 'dark'|'light' | null
      const initial = saved || 'dark'
      setTheme(initial)
      document.body.classList.toggle('light-mode', initial === 'light')
    } catch {}
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.body.classList.toggle('light-mode', next === 'light')
    try { localStorage.setItem('sm:theme', next) } catch {}
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
