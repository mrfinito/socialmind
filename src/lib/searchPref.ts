'use client'
// Global search preference - read/write helper.
// Synced across tabs via 'storage' event + custom 'sm-search-pref-changed'.
// Default: true (search ON).

import { useEffect, useState } from 'react'

const KEY = 'sm:use-search'

export function getSearchPref(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const v = localStorage.getItem(KEY)
    if (v === null) return true  // default ON
    return v === 'true'
  } catch {
    return true
  }
}

export function setSearchPref(value: boolean) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, String(value))
    window.dispatchEvent(new CustomEvent('sm-search-pref-changed', { detail: value }))
  } catch {}
}

/**
 * Hook to read & subscribe to search preference.
 * Returns [enabled, setEnabled] tuple.
 */
export function useSearchPref(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    setEnabled(getSearchPref())

    const onChange = (e: Event) => {
      const ev = e as CustomEvent<boolean>
      if (typeof ev.detail === 'boolean') {
        setEnabled(ev.detail)
      } else {
        setEnabled(getSearchPref())
      }
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setEnabled(getSearchPref())
    }
    window.addEventListener('sm-search-pref-changed', onChange as EventListener)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('sm-search-pref-changed', onChange as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  function update(value: boolean) {
    setSearchPref(value)
    setEnabled(value)
  }

  return [enabled, update]
}
