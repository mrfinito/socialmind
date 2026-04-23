'use client'

// Generic history manager — stores generated content per module per project
// Max 20 entries per module per project

export interface HistoryEntry<T = unknown> {
  id: string
  projectId: string
  module: string
  title: string        // short display label
  subtitle?: string    // secondary info (platform, date, etc)
  data: T
  createdAt: string
}

const MAX_PER_MODULE = 20

function key(module: string, projectId: string) {
  return `history_${module}_${projectId}`
}

export function historyLoad<T>(module: string, projectId: string): HistoryEntry<T>[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(key(module, projectId)) || '[]')
  } catch { return [] }
}

export function historySave<T>(
  module: string,
  projectId: string,
  entry: Omit<HistoryEntry<T>, 'id' | 'createdAt' | 'module' | 'projectId'>
): HistoryEntry<T> {
  const newEntry: HistoryEntry<T> = {
    ...entry,
    id: Date.now().toString(),
    module,
    projectId,
    createdAt: new Date().toISOString(),
  }
  const existing = historyLoad<T>(module, projectId)
  const updated = [newEntry, ...existing].slice(0, MAX_PER_MODULE)
  try {
    localStorage.setItem(key(module, projectId), JSON.stringify(updated))
  } catch {}
  return newEntry
}

export function historyDelete(module: string, projectId: string, id: string) {
  const existing = historyLoad(module, projectId)
  const updated = existing.filter(e => e.id !== id)
  try {
    localStorage.setItem(key(module, projectId), JSON.stringify(updated))
  } catch {}
  return updated
}

export function historyClear(module: string, projectId: string) {
  try { localStorage.removeItem(key(module, projectId)) } catch {}
}
