'use client'
import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { PLATFORMS } from '@/lib/types'
import PlatformIcon from '@/components/PlatformIcon'
import type { Platform } from '@/lib/types'
import Link from 'next/link'

const DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie']
const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
}

export default function KalendarzPage() {
  const { state, projectDrafts } = useStore()
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const posts = (projectDrafts || []).filter(p => p && Array.isArray(p.platforms))

  function getPostsForDay(day: number) {
    return posts.filter(p => {
      const d = new Date(p.createdAt)
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day
    })
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Kalendarz</h1>
            <p className="text-gray-500 text-sm mt-1">Historia wygenerowanych postów</p>
          </div>
          <Link href="/generuj" className="btn-primary">+ Nowy post</Link>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="btn-ghost px-3">←</button>
          <h2 className="text-lg font-semibold text-white">{MONTHS[viewMonth]} {viewYear}</h2>
          <button onClick={nextMonth} className="btn-ghost px-3">→</button>
        </div>

        {/* Calendar grid */}
        <div className="card p-0 overflow-hidden mb-6">
          <div className="grid grid-cols-7 border-b border-white/6">
            {DAYS.map(d => (
              <div key={d} className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const dayPosts = day ? getPostsForDay(day) : []
              const isToday = day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear()
              return (
                <div key={i} className="min-h-[90px] p-2 border-b border-r border-white/4 last:border-r-0"
                  style={{ background: day ? 'transparent' : 'rgba(0,0,0,0.2)' }}>
                  {day && (
                    <>
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1
                        ${isToday ? 'bg-indigo-500 text-white' : 'text-gray-500'}`}>
                        {day}
                      </span>
                      <div className="space-y-0.5">
                        {dayPosts.slice(0, 2).map(p => {
                          const plt = PLATFORMS.find(x => x.id === p.platforms[0])
                          return (
                            <div key={p.id} className="text-[10px] px-1.5 py-0.5 rounded truncate"
                              style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                              {plt?.emoji} {p.topic.slice(0, 14)}...
                            </div>
                          )
                        })}
                        {dayPosts.length > 2 && (
                          <div className="text-[10px] text-gray-600 pl-1">+{dayPosts.length - 2} więcej</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent posts list */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Wszystkie posty ({posts.length})</h3>
          {posts.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-6">Brak wygenerowanych postów — <Link href="/generuj" className="text-indigo-400 hover:text-indigo-300">stwórz pierwszy</Link></p>
          ) : (
            <div className="space-y-2">
              {posts.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/3 group transition-all">
                  <div className="flex gap-1 shrink-0">
                    {p.platforms.slice(0, 3).map(plt => (
                      <PlatformIcon key={plt} platform={plt} size={26} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate">{p.topic || 'Post bez tematu'}</p>
                    <p className="text-xs text-gray-600">{new Date(p.createdAt).toLocaleString('pl', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {p.platforms.map(plt => {
                      const pconf = PLATFORMS.find(x => x.id === plt)
                      return <span key={plt} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{pconf?.name}</span>
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
