'use client'
import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { PLATFORMS } from '@/lib/types'
import type { PostDraft, Platform, GeneratedPost } from '@/lib/types'
import PlatformIcon from '@/components/PlatformIcon'
import Link from 'next/link'

const DAYS_PL = ['Pon','Wt','Śr','Czw','Pt','Sob','Nie']
const MONTHS_PL = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']
const HOURS = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`)

function getMonthDays(y:number,m:number) { return new Date(y,m+1,0).getDate() }
function getFirstDay(y:number,m:number) { return (new Date(y,m,1).getDay()+6)%7 }


interface WeekViewProps {
  weekOffset: number
  setWeekOffset: (fn: (n: number) => number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projectDrafts: any[]
  now: Date
  markPublished: (id: string) => void
  deleteDraft: (id: string) => void
}

function WeekView({ weekOffset, setWeekOffset, projectDrafts, now, markPublished, deleteDraft }: WeekViewProps) {
  const getWeekStart = () => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1 + weekOffset * 7)
    return d
  }
  const weekStart = getWeekStart()
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset(w => w - 1)} className="btn-ghost px-3">← Poprzedni tydzień</button>
        <h3 className="text-sm font-semibold text-white">
          {weekStart.toLocaleDateString('pl', {day:'numeric',month:'short'})} — {weekEnd.toLocaleDateString('pl', {day:'numeric',month:'short',year:'numeric'})}
        </h3>
        <button onClick={() => setWeekOffset(w => w + 1)} className="btn-ghost px-3">Następny tydzień →</button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({length:7}, (_,i) => {
          const d = new Date(weekStart)
          d.setDate(d.getDate() + i)
          const isToday = d.toDateString() === now.toDateString()
          const dayDrafts = projectDrafts.filter(draft => {
            if (!draft.scheduledAt) return false
            return new Date(draft.scheduledAt).toDateString() === d.toDateString()
          })
          return (
            <div key={i} className="rounded-2xl overflow-hidden"
              style={{border:`1px solid ${isToday?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.06)'}`,background:isToday?'rgba(99,102,241,0.06)':'#181c27',minHeight:320}}>
              <div className="px-3 py-2.5 text-center" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <p className="text-[10px] text-gray-600">{['Pon','Wt','Śr','Czw','Pt','Sob','Nie'][i]}</p>
                <span className={`text-lg font-bold ${isToday?'text-indigo-400':'text-white'}`}>{d.getDate()}</span>
              </div>
              <div className="p-2 space-y-2">
                {dayDrafts.map(draft => {
                  const post = draft.content[draft.platforms[0] as keyof typeof draft.content] as {text?:string;generatedImageUrl?:string;editedImageUrl?:string}|undefined
                  const img = post?.editedImageUrl || post?.generatedImageUrl
                  return (
                    <div key={draft.id} className="rounded-xl overflow-hidden"
                      style={{background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.25)'}}>
                      {img && <img src={img} alt="" className="w-full h-20 object-cover"/>}
                      <div className="p-2">
                        <p className="text-[10px] text-indigo-200 leading-tight line-clamp-2">{draft.topic}</p>
                        <div className="flex gap-1 mt-1.5">
                          <button onClick={() => markPublished(draft.id)} className="text-[9px] text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5">✓</button>
                          <button onClick={() => deleteDraft(draft.id)} className="text-[9px] text-red-400 border border-red-500/20 rounded px-1.5 py-0.5">✕</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {dayDrafts.length === 0 && (
                  <div className="h-16 rounded-xl border border-dashed border-white/5 flex items-center justify-center">
                    <p className="text-[10px] text-gray-700">Przeciągnij post</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SchedulerPage() {
  const { projectDrafts, scheduleDraft, markPublished, deleteDraft, activeProject } = useStore()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<number|null>(null)
  const [dragOver, setDragOver] = useState<string|null>(null)
  const [view, setView] = useState<'month'|'week'>('month')
  const [weekOffset, setWeekOffset] = useState(0)

  const days = getMonthDays(year,month)
  const firstDay = getFirstDay(year,month)
  const cells = Array.from({length:firstDay+days},(_,i) => i<firstDay ? null : i-firstDay+1)

  function getDayDrafts(day:number): PostDraft[] {
    return projectDrafts.filter(d => {
      if (!d.scheduledAt && d.status!=='draft') return false
      if (d.scheduledAt) {
        const sd = new Date(d.scheduledAt)
        return sd.getFullYear()===year && sd.getMonth()===month && sd.getDate()===day
      }
      return false
    })
  }

  function getUnscheduled(): PostDraft[] {
    return projectDrafts.filter(d => d.status==='draft' && !d.scheduledAt)
  }

  function handleDrop(e:React.DragEvent, day:number) {
    e.preventDefault()
    const draftId = e.dataTransfer.getData('draftId')
    if (!draftId) return
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    scheduleDraft(draftId, `${dateStr}T12:00:00`)
    setDragOver(null)
  }

  const unscheduled = getUnscheduled()

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">Scheduler</h1>
            <p className="text-gray-500 text-sm mt-1">{activeProject?.name} · Planuj i zarządzaj harmonogramem publikacji</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              {(['month','week'] as const).map(v => (
                <button key={v} onClick={()=>setView(v)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{background:view===v?'rgba(99,102,241,0.2)':'transparent',color:view===v?'#a5b4fc':'#6b7280'}}>
                  {v==='month'?'Miesiąc':'Tydzień'}
                </button>
              ))}
            </div>
            <Link href="/generuj" className="btn-primary text-sm">+ Nowy post</Link>
          </div>
        </div>

        <div className="flex gap-5">
          {/* Calendar */}
          <div className="flex-1">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={()=>{if(month===0){setYear(y=>y-1);setMonth(11)}else setMonth(m=>m-1)}}
                className="btn-ghost px-3 py-2">←</button>
              <h2 className="text-base font-semibold text-white">{MONTHS_PL[month]} {year}</h2>
              <button onClick={()=>{if(month===11){setYear(y=>y+1);setMonth(0)}else setMonth(m=>m+1)}}
                className="btn-ghost px-3 py-2">→</button>
            </div>

            <div className="card p-0 overflow-hidden">
              <div className="grid grid-cols-7" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                {DAYS_PL.map(d=>(
                  <div key={d} className="text-center py-2.5 text-xs font-medium text-gray-600">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((day,i)=>{
                  if (!day) return <div key={i} style={{minHeight:80,background:'rgba(0,0,0,0.15)',borderRight:'1px solid rgba(255,255,255,0.04)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}/>
                  const dayDrafts = getDayDrafts(day)
                  const isToday = day===now.getDate()&&month===now.getMonth()&&year===now.getFullYear()
                  const isSelected = selectedDay===day
                  const isDragTarget = dragOver===`${year}-${month}-${day}`
                  return (
                    <div key={i}
                      style={{
                        minHeight:80, padding:'6px',
                        background: isDragTarget ? 'rgba(99,102,241,0.12)' : isSelected ? 'rgba(99,102,241,0.06)' : 'transparent',
                        borderRight:'1px solid rgba(255,255,255,0.04)',
                        borderBottom:'1px solid rgba(255,255,255,0.04)',
                        cursor:'pointer',
                      }}
                      onClick={()=>setSelectedDay(isSelected?null:day)}
                      onDragOver={e=>{e.preventDefault();setDragOver(`${year}-${month}-${day}`)}}
                      onDragLeave={()=>setDragOver(null)}
                      onDrop={e=>handleDrop(e,day)}>
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday?'bg-indigo-500 text-white':'text-gray-500'}`}>
                        {day}
                      </span>
                      {dayDrafts.slice(0,2).map(d=>{
                        const plt = PLATFORMS.find(x=>x.id===d.platforms[0])
                        return (
                          <div key={d.id} className="text-[9px] px-1.5 py-0.5 rounded mb-0.5 truncate flex items-center gap-1"
                            style={{background:'rgba(99,102,241,0.2)',color:'#a5b4fc'}}>
                            <span>{plt?.emoji}</span> {d.topic?.slice(0,12)||'Post'}
                          </div>
                        )
                      })}
                      {dayDrafts.length>2&&<div className="text-[9px] text-gray-600">+{dayDrafts.length-2}</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* WEEK VIEW */}
            {view === 'week' && (
              <WeekView
                weekOffset={weekOffset}
                setWeekOffset={setWeekOffset}
                projectDrafts={projectDrafts}
                now={now}
                markPublished={markPublished}
                deleteDraft={deleteDraft}
              />
            )}
          </div>

          {/* Sidebar: unscheduled drafts */}
          <div className="w-64 shrink-0">
            <div className="card">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Szkice ({unscheduled.length})
              </h3>
              <p className="text-[11px] text-gray-600 mb-3">Przeciągnij post na dzień w kalendarzu</p>
              {unscheduled.length===0
                ? <p className="text-xs text-gray-700 text-center py-4">Brak szkiców</p>
                : <div className="space-y-2">
                  {unscheduled.map(d=>(
                    <div key={d.id}
                      draggable
                      onDragStart={e=>{e.dataTransfer.setData('draftId',d.id);e.dataTransfer.effectAllowed='move'}}
                      className="p-2.5 rounded-xl cursor-grab active:cursor-grabbing transition-all"
                      style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
                      <div className="flex gap-1 mb-1.5">
                        {d.platforms.slice(0,3).map(p=><PlatformIcon key={p} platform={p} size={18}/>)}
                      </div>
                      <p className="text-xs text-gray-300 leading-tight">{d.topic?.slice(0,40)||'Post bez tematu'}</p>
                      <p className="text-[10px] text-gray-600 mt-1">{new Date(d.updatedAt).toLocaleDateString('pl')}</p>
                    </div>
                  ))}
                </div>
              }
              <Link href="/generuj" className="btn-secondary w-full text-center text-xs py-2 mt-3 block">+ Nowy post</Link>
            </div>

            {/* Legend */}
            <div className="card mt-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Legenda</h3>
              {[{c:'bg-indigo-500',l:'Zaplanowany'},{c:'bg-emerald-500',l:'Opublikowany'},{c:'bg-gray-600',l:'Szkic'}].map(({c,l})=>(
                <div key={l} className="flex items-center gap-2 py-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${c}`}/>
                  <span className="text-xs text-gray-500">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

// Week view component - appended
export { }
