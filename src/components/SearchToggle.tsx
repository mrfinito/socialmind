'use client'
import { useSearchPref } from '@/lib/searchPref'

/**
 * Compact toggle for per-module search override.
 * Reads global preference from localStorage. Use the returned `enabled` boolean
 * when calling the API: pass it as `useSearch` in the request body.
 *
 * Usage:
 *   const [searchEnabled, setSearchEnabled] = useState<boolean>(true)
 *   <SearchToggle enabled={searchEnabled} onChange={setSearchEnabled} />
 *   // Then in fetch body: { ..., useSearch: searchEnabled }
 */
export function SearchToggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all w-full disabled:opacity-50"
      style={{
        background: enabled ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${enabled ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'}`,
      }}
      title={enabled
        ? 'Kliknij aby wyłączyć wyszukiwarkę dla tej generacji (oszczędza kredyty Tavily)'
        : 'Kliknij aby włączyć wyszukiwarkę — AI dostanie świeże dane z internetu'}>
      <span className="text-base shrink-0">{enabled ? '🌐' : '⏸️'}</span>
      <div className="flex-1 text-left min-w-0">
        <p className={`text-xs font-medium ${enabled ? 'text-gray-200' : 'text-gray-500'}`}>
          {enabled ? 'Wyszukiwarka: WŁĄCZONA' : 'Wyszukiwarka: WYŁĄCZONA'}
        </p>
        <p className="text-[10px] text-gray-600 truncate">
          {enabled
            ? 'AI dostanie świeże dane z internetu (~2-3 zapytania Tavily)'
            : 'AI użyje tylko wiedzy z trainingu — szybciej i taniej'}
        </p>
      </div>
      <div className={`w-8 h-4 rounded-full transition-all relative shrink-0 ${enabled ? 'bg-indigo-500' : 'bg-gray-700'}`}>
        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`}/>
      </div>
    </button>
  )
}

/**
 * Hook that returns the search-enabled state, initialized from localStorage prefs.
 * Use this when you want a per-page toggle that defaults to the global pref.
 */
export function useModuleSearchPref(): [boolean, (v: boolean) => void] {
  return useSearchPref()
}
