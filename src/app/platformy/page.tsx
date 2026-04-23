'use client'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { PLATFORMS } from '@/lib/types'
import PlatformIcon from '@/components/PlatformIcon'
import type { Platform } from '@/lib/types'
import Link from 'next/link'

const PLATFORM_TIPS: Record<Platform, string> = {
  facebook:  'Najlepsze godziny: 13–16 i 19–21. Posty z obrazkiem mają 2x więcej zasięgu.',
  instagram: 'Używaj 8–15 hashtagów. Stories zwiększają zaangażowanie o 40%.',
  linkedin:  'Publikuj we wtorek–czwartek rano. Posty z pytaniem mają 3x więcej komentarzy.',
  x:         'Tweety z obrazkiem mają 150% więcej retweet. Optymalnie 1–3 hashtagi.',
  pinterest: 'Piny pionowe (2:3) mają 60% więcej klikalności. Dodaj słowa kluczowe w opisie.',
  tiktok:    'Hook w pierwszych 3 sekundach jest kluczowy. Używaj trendujących dźwięków.',
}

export default function PlatformyPage() {
  const { state, dna, selectedPlatforms, savePlatforms } = useStore()
  const selected = selectedPlatforms || []

  function toggle(id: Platform) {
    savePlatforms(
      selected.includes(id) ? selected.filter(p => p !== id) : [...selected, id]
    )
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Platformy</h1>
            <p className="text-gray-500 text-sm mt-1">Wybierz kanały na których publikujesz — ustawienie jest zapamiętywane</p>
          </div>
          <Link href="/generuj" className="btn-primary">Generuj posty →</Link>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {PLATFORMS.map(p => {
            const active = selected.includes(p.id)
            return (
              <button key={p.id} onClick={() => toggle(p.id)}
                className="text-left rounded-2xl p-5 border transition-all"
                style={{
                  background: active ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                  borderColor: active ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)',
                }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <PlatformIcon platform={p.id} size={40} />
                    <div>
                      <p className="font-semibold text-white text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.format}</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'border-indigo-400 bg-indigo-500' : 'border-gray-700 bg-transparent'}`}>
                    {active && <span className="text-white text-[10px]">✓</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                  <span className="font-mono">{p.dimensions}</span>
                  <span>·</span>
                  <span>max {p.maxChars} znaków</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{PLATFORM_TIPS[p.id]}</p>
              </button>
            )
          })}
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-1">Aktywne platformy ({selected.length})</h3>
          <p className="text-xs text-gray-500 mb-3">Te platformy będą używane domyślnie przy generowaniu postów</p>
          <div className="flex gap-2 flex-wrap">
            {selected.length === 0
              ? <p className="text-xs text-gray-600">Żadna platforma nie jest wybrana</p>
              : selected.map(id => {
                const p = PLATFORMS.find(x => x.id === id)!
                return (
                  <span key={id} className="tag tag-active flex items-center gap-1.5">
                    {p.emoji} {p.name}
                    <button onClick={() => toggle(id)} className="opacity-60 hover:opacity-100">✕</button>
                  </span>
                )
              })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
