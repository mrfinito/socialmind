'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import type { BrandVisuals } from '@/lib/types'

interface TextLayer {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  fontWeight: 'normal' | 'bold'
  fontFamily: string
}

interface LogoLayer {
  x: number
  y: number
  width: number
  opacity: number
}

interface Props {
  imageUrl: string
  visuals?: BrandVisuals
  onSave: (dataUrl: string) => void
  onClose: () => void
}

const FONTS = ['Inter', 'Georgia', 'Arial', 'Courier New', 'Impact']

export default function ImageEditor({ imageUrl, visuals, onSave, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null)
  const [logoLayer, setLogoLayer] = useState<LogoLayer>({ x: 20, y: 20, width: 120, opacity: 1 })
  const [showLogo, setShowLogo] = useState(!!visuals?.logoUrl)
  const [textLayers, setTextLayers] = useState<TextLayer[]>([])
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [dragging, setDragging] = useState<'logo' | string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [newText, setNewText] = useState('')
  const [textColor, setTextColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState(32)
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('bold')
  const [fontFamily, setFontFamily] = useState('Inter')
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 })

  // Load background image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setBgImage(img)
      // Scale canvas to fit container (max 600px wide)
      const maxW = 600
      const scale = Math.min(1, maxW / img.width)
      setCanvasSize({ w: Math.round(img.width * scale), h: Math.round(img.height * scale) })
    }
    img.src = imageUrl
  }, [imageUrl])

  // Load logo image
  useEffect(() => {
    if (!visuals?.logoUrl) return
    const img = new Image()
    img.onload = () => setLogoImage(img)
    img.src = visuals.logoUrl
    // Set initial logo position based on visuals settings
    const pct = (visuals.logoSizePercent || 15) / 100
    const logoW = 600 * pct
    setLogoLayer(prev => ({ ...prev, width: logoW }))
  }, [visuals?.logoUrl, visuals?.logoSizePercent])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !bgImage) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvasSize.w
    canvas.height = canvasSize.h

    // Background image
    ctx.drawImage(bgImage, 0, 0, canvasSize.w, canvasSize.h)

    // Logo
    if (showLogo && logoImage) {
      const aspect = logoImage.height / logoImage.width
      const lh = logoLayer.width * aspect
      ctx.globalAlpha = logoLayer.opacity
      ctx.drawImage(logoImage, logoLayer.x, logoLayer.y, logoLayer.width, lh)
      ctx.globalAlpha = 1

      // Selection border
      if (dragging === 'logo' || selectedText === null) {
        ctx.strokeStyle = '#4F6EF7'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 3])
        ctx.strokeRect(logoLayer.x - 2, logoLayer.y - 2, logoLayer.width + 4, lh + 4)
        ctx.setLineDash([])
      }
    }

    // Text layers
    textLayers.forEach(layer => {
      ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`
      ctx.fillStyle = layer.color
      // Shadow for readability
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 6
      ctx.fillText(layer.text, layer.x, layer.y)
      ctx.shadowBlur = 0

      if (selectedText === layer.id) {
        const metrics = ctx.measureText(layer.text)
        ctx.strokeStyle = '#4F6EF7'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 3])
        ctx.strokeRect(layer.x - 4, layer.y - layer.fontSize - 4, metrics.width + 8, layer.fontSize + 12)
        ctx.setLineDash([])
      }
    })
  }, [bgImage, logoImage, logoLayer, showLogo, textLayers, selectedText, dragging, canvasSize])

  useEffect(() => { draw() }, [draw])

  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const scaleX = canvasSize.w / rect.width
    const scaleY = canvasSize.h / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const pos = getCanvasPos(e)

    // Check logo hit
    if (showLogo && logoImage) {
      const aspect = logoImage.height / logoImage.width
      const lh = logoLayer.width * aspect
      if (pos.x >= logoLayer.x && pos.x <= logoLayer.x + logoLayer.width &&
          pos.y >= logoLayer.y && pos.y <= logoLayer.y + lh) {
        setDragging('logo')
        setDragOffset({ x: pos.x - logoLayer.x, y: pos.y - logoLayer.y })
        setSelectedText(null)
        return
      }
    }

    // Check text hit
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    for (let i = textLayers.length - 1; i >= 0; i--) {
      const layer = textLayers[i]
      ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`
      const w = ctx.measureText(layer.text).width
      if (pos.x >= layer.x - 4 && pos.x <= layer.x + w + 4 &&
          pos.y >= layer.y - layer.fontSize - 4 && pos.y <= layer.y + 12) {
        setDragging(layer.id)
        setDragOffset({ x: pos.x - layer.x, y: pos.y - layer.y })
        setSelectedText(layer.id)
        return
      }
    }
    setSelectedText(null)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragging) return
    const pos = getCanvasPos(e)
    if (dragging === 'logo') {
      setLogoLayer(prev => ({ ...prev, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y }))
    } else {
      setTextLayers(prev => prev.map(l => l.id === dragging
        ? { ...l, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } : l))
    }
  }

  function handleMouseUp() { setDragging(null) }

  function addText() {
    if (!newText.trim()) return
    const id = Date.now().toString()
    setTextLayers(prev => [...prev, {
      id, text: newText, x: 40, y: canvasSize.h / 2,
      fontSize, color: textColor, fontWeight, fontFamily
    }])
    setNewText('')
    setSelectedText(id)
  }

  function deleteSelected() {
    if (selectedText) {
      setTextLayers(prev => prev.filter(l => l.id !== selectedText))
      setSelectedText(null)
    }
  }

  function updateSelectedText(field: keyof TextLayer, value: string | number) {
    setTextLayers(prev => prev.map(l => l.id === selectedText ? { ...l, [field]: value } : l))
  }

  function exportPNG() {
    // Redraw at full res before export
    const canvas = canvasRef.current
    if (!canvas || !bgImage) return
    const fullCanvas = document.createElement('canvas')
    fullCanvas.width = bgImage.naturalWidth
    fullCanvas.height = bgImage.naturalHeight
    const ctx = fullCanvas.getContext('2d')
    if (!ctx) return

    const scaleX = bgImage.naturalWidth / canvasSize.w
    const scaleY = bgImage.naturalHeight / canvasSize.h

    ctx.drawImage(bgImage, 0, 0)

    if (showLogo && logoImage) {
      const aspect = logoImage.height / logoImage.width
      ctx.globalAlpha = logoLayer.opacity
      ctx.drawImage(logoImage,
        logoLayer.x * scaleX, logoLayer.y * scaleY,
        logoLayer.width * scaleX, logoLayer.width * aspect * scaleY)
      ctx.globalAlpha = 1
    }

    textLayers.forEach(layer => {
      ctx.font = `${layer.fontWeight} ${layer.fontSize * scaleX}px ${layer.fontFamily}`
      ctx.fillStyle = layer.color
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 8
      ctx.fillText(layer.text, layer.x * scaleX, layer.y * scaleY)
      ctx.shadowBlur = 0
    })

    const dataUrl = fullCanvas.toDataURL('image/png')
    onSave(dataUrl)
  }

  const selectedLayer = textLayers.find(l => l.id === selectedText)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h3 className="font-semibold text-white">Edytor grafiki</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-400 text-xl leading-none">✕</button>
        </div>

        <div className="flex gap-0 h-full">
          {/* Canvas */}
          <div className="flex-1 p-4 bg-white/4 flex items-center justify-center min-h-[300px]">
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              className="max-w-full border border-white/10 rounded-xl shadow-sm cursor-crosshair"
              style={{ maxHeight: '60vh', width: '100%', objectFit: 'contain' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          {/* Controls */}
          <div className="w-72 border-l border-white/8 p-4 space-y-5 overflow-y-auto">

            {/* Logo / Image upload */}
            <div>
              <p className="label">Logo lub dodatkowa grafika</p>
              <div className="space-y-2">
                {logoImage ? (
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer flex-1">
                      <input type="checkbox" checked={showLogo} onChange={e => setShowLogo(e.target.checked)} />
                      Pokaż na grafice
                    </label>
                    <button onClick={() => { setLogoImage(null); setShowLogo(false) }}
                      className="text-xs text-red-400 hover:text-red-300">🗑 Usuń</button>
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <label className="flex-1 text-xs py-2 px-3 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 cursor-pointer text-center transition-all">
                    📎 Wgraj plik (PNG/JPG)
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = ev => {
                          const img = new Image()
                          img.onload = () => {
                            setLogoImage(img)
                            setShowLogo(true)
                            setLogoLayer({ x: 20, y: 20, width: Math.min(200, img.width), opacity: 1 })
                          }
                          img.src = ev.target?.result as string
                        }
                        reader.readAsDataURL(file)
                        e.target.value = ''
                      }} />
                  </label>
                  {visuals?.logoUrl && (
                    <button onClick={() => {
                        const img = new Image()
                        img.onload = () => {
                          setLogoImage(img)
                          setShowLogo(true)
                          const pct = (visuals.logoSizePercent || 15) / 100
                          setLogoLayer({ x: 20, y: 20, width: 600 * pct, opacity: 1 })
                        }
                        img.src = visuals.logoUrl!
                      }}
                      className="text-xs py-2 px-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-all">
                      ⭐ Logo marki
                    </button>
                  )}
                </div>

                {showLogo && logoImage && (
                  <div className="space-y-2 pt-2 border-t border-white/5 mt-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Rozmiar ({Math.round(logoLayer.width)}px)</p>
                      <input type="range" min="40" max="500" value={logoLayer.width}
                        onChange={e => setLogoLayer(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                        className="w-full" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Przezroczystosc ({Math.round(logoLayer.opacity * 100)}%)</p>
                      <input type="range" min="20" max="100" value={logoLayer.opacity * 100}
                        onChange={e => setLogoLayer(prev => ({ ...prev, opacity: parseInt(e.target.value) / 100 }))}
                        className="w-full" />
                    </div>
                    <p className="text-xs text-gray-500">💡 Przeciągnij na grafice żeby zmienić pozycję</p>
                  </div>
                )}
              </div>
            </div>

            {/* Add text */}
            <div>
              <p className="label">Dodaj tekst</p>
              <div className="space-y-2">
                <input className="input text-sm" placeholder="Wpisz tekst..." value={newText}
                  onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addText()} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Kolor</p>
                    <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                      className="w-full h-8 rounded border border-white/10 cursor-pointer" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Rozmiar ({fontSize}px)</p>
                    <input type="range" min="12" max="120" value={fontSize}
                      onChange={e => setFontSize(parseInt(e.target.value))} className="w-full mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select className="input text-xs py-1.5" value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                    {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select className="input text-xs py-1.5" value={fontWeight} onChange={e => setFontWeight(e.target.value as 'normal' | 'bold')}>
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
                <button className="btn-secondary w-full text-sm py-2" onClick={addText} disabled={!newText.trim()}>
                  + Dodaj tekst
                </button>
              </div>
            </div>

            {/* Selected text controls */}
            {selectedLayer && (
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-brand-700">Zaznaczony tekst</p>
                  <button onClick={deleteSelected} className="text-red-400 hover:text-red-600 text-xs">Usun</button>
                </div>
                <input className="input text-sm" value={selectedLayer.text}
                  onChange={e => updateSelectedText('text', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Kolor</p>
                    <input type="color" value={selectedLayer.color}
                      onChange={e => updateSelectedText('color', e.target.value)}
                      className="w-full h-7 rounded border border-white/10" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Rozmiar</p>
                    <input type="range" min="12" max="120" value={selectedLayer.fontSize}
                      onChange={e => updateSelectedText('fontSize', parseInt(e.target.value))}
                      className="w-full mt-1" />
                  </div>
                </div>
                <p className="text-xs text-gray-400">Przeciagnij tekst na obrazku zeby zmienic pozycje</p>
              </div>
            )}

            {/* Text layers list */}
            {textLayers.length > 0 && (
              <div>
                <p className="label">Warstwy tekstowe ({textLayers.length})</p>
                <div className="space-y-1">
                  {textLayers.map(l => (
                    <div key={l.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                        selectedText === l.id ? 'bg-brand-50 border border-brand-200' : 'bg-white/4 hover:bg-white/6'}`}
                      onClick={() => setSelectedText(l.id)}>
                      <span className="truncate flex-1 mr-2" style={{ color: l.color === '#ffffff' ? '#333' : l.color }}>{l.text}</span>
                      <button onClick={e => { e.stopPropagation(); setTextLayers(prev => prev.filter(x => x.id !== l.id)) }}
                        className="text-gray-400 hover:text-red-500">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/8">
          <button className="btn-secondary" onClick={onClose}>Anuluj</button>
          <div className="flex gap-2">
            <button className="btn-secondary text-sm" onClick={() => {
              const a = document.createElement('a')
              a.href = canvasRef.current?.toDataURL('image/png') || ''
              a.download = 'grafika_preview.png'
              a.click()
            }}>Pobierz podglad</button>
            <button className="btn-primary" onClick={exportPNG}>Zapisz pelna rozdzielczosc →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
