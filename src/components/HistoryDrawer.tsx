'use client'
import { useState } from 'react'
import type { HistoryEntry } from '@/lib/history'
import { historyDelete } from '@/lib/history'

interface Props<T> {
  module: string
  projectId: string
  entries: HistoryEntry<T>[]
  onLoad: (entry: HistoryEntry<T>) => void
  onDelete: (id: string) => void
  formatTitle?: (entry: HistoryEntry<T>) => string
  formatSubtitle?: (entry: HistoryEntry<T>) => string
  icon?: string
  emptyText?: string
}

export default function HistoryDrawer<T>({
  module, projectId, entries, onLoad, onDelete,
  formatTitle, formatSubtitle, icon = '📋', emptyText = 'Brak historii'
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string|null>(null)

  function handleDelete(id: string) {
    historyDelete(module, projectId, id)
    onDelete(id)
    setConfirmDel(null)
  }

  if (entries.length === 0) return null

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl transition-all"
        style={{
          background: open ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
          color: open ? '#a5b4fc' : '#6b7280',
        }}>
        🕐 Historia ({entries.length})
        <span className="text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {/* Drawer */}
      {open && (
        <div className="rounded-2xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.08)',background:'#181c27'}}>
          <div className="px-4 py-3 flex items-center justify-between"
            style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <p className="text-xs font-semibold text-gray-400">Historia — {entries.length} zapisanych</p>
            <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-400 text-sm">✕</button>
          </div>
          <div className="divide-y" style={{divideColor:'rgba(255,255,255,0.04)'}}>
            {entries.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-all group">
                <span className="text-lg shrink-0">{icon}</span>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { onLoad(entry); setOpen(false) }}>
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {formatTitle ? formatTitle(entry) : entry.title}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    {formatSubtitle ? formatSubtitle(entry) : entry.subtitle || ''}
                    {' · '}
                    {new Date(entry.createdAt).toLocaleDateString('pl', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                  </p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <button onClick={() => { onLoad(entry); setOpen(false) }}
                    className="text-xs px-2.5 py-1 rounded-lg"
                    style={{background:'rgba(99,102,241,0.2)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.3)'}}>
                    Załaduj
                  </button>
                  {confirmDel === entry.id ? (
                    <button onClick={() => handleDelete(entry.id)}
                      className="text-xs px-2.5 py-1 rounded-lg"
                      style={{background:'rgba(239,68,68,0.2)',color:'#f87171',border:'1px solid rgba(239,68,68,0.3)'}}>
                      Potwierdź
                    </button>
                  ) : (
                    <button onClick={() => setConfirmDel(entry.id)}
                      className="text-gray-700 hover:text-red-400 transition-colors text-sm px-1">
                      🗑
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
