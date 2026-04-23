'use client'
import { useRef } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'

const TYPE_ICONS: Record<string, string> = {
  logo: '🔷', brandbook: '📋', image: '🖼', doc: '📄', other: '📁',
}

export default function MaterialyPage() {
  const { state, addMaterial, deleteMaterial, projectMaterials } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).slice(0, 10).forEach(f => {
      const type = f.type.startsWith('image/') ? 'image' : f.name.endsWith('.pdf') ? 'doc' : 'other'
      const reader = new FileReader()
      reader.onload = () => {
        addMaterial({ name: f.name, type, size: `${(f.size / 1024).toFixed(0)} KB`, dataUrl: reader.result as string })
      }
      reader.readAsDataURL(f)
    })
  }

  const mats = projectMaterials || []

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Moje materiały</h1>
            <p className="text-gray-500 text-sm mt-1">Loga, brandboki, zdjęcia i dokumenty</p>
          </div>
          <button onClick={() => fileRef.current?.click()} className="btn-primary">+ Dodaj pliki</button>
          <input ref={fileRef} type="file" className="hidden" multiple onChange={e => handleFiles(e.target.files)} />
        </div>

        {/* Upload zone */}
        <div
          className="rounded-2xl border-2 border-dashed border-white/10 p-10 text-center mb-6 cursor-pointer transition-all hover:border-indigo-500/30 hover:bg-indigo-500/3"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        >
          <p className="text-3xl mb-3">📂</p>
          <p className="text-gray-300 font-medium">Przeciągnij pliki lub kliknij żeby wybrać</p>
          <p className="text-gray-600 text-sm mt-1">Dowolne formaty — obrazy, PDF, dokumenty</p>
        </div>

        {mats.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-sm">Brak materiałów — wgraj loga, brandboki i inspiracje</p>
          </div>
        ) : (
          <div className="card">
            <div className="grid grid-cols-1 gap-1">
              {mats.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/3 group transition-all">
                  {m.dataUrl && m.type === 'image'
                    ? <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.dataUrl} alt={m.name} className="w-full h-full object-cover" />
                      </div>
                    : <span className="text-2xl w-10 text-center shrink-0">{TYPE_ICONS[m.type] || '📁'}</span>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate">{m.name}</p>
                    <p className="text-xs text-gray-600">{m.type} · {m.size} · {new Date(m.addedAt).toLocaleDateString('pl')}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    {m.dataUrl && (
                      <a href={m.dataUrl} download={m.name} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-white/5 transition-all">
                        Pobierz
                      </a>
                    )}
                    <button onClick={() => deleteMaterial(m.id)} className="text-xs text-gray-600 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all">
                      Usuń
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
