import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 120
export const runtime = 'nodejs'

interface Slide {
  id: string
  type: 'title' | 'section' | 'content' | 'stats' | 'quote' | 'comparison' | 'cta'
  title: string
  subtitle?: string
  content?: string[]
  speakerNotes?: string
  imageUrl?: string
}

interface Presentation {
  title: string
  subtitle?: string
  slides: Slide[]
  theme?: {
    primary?: string
    secondary?: string
    background?: string
    text?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const { presentation } = await req.json() as { presentation: Presentation }
    if (!presentation?.slides?.length) {
      return NextResponse.json({ error: 'Brak slajdow' }, { status: 400 })
    }

    const PptxGenJS = (await import('pptxgenjs')).default
    const pptx = new PptxGenJS()
    
    // 16:9 widescreen
    pptx.layout = 'LAYOUT_WIDE'
    pptx.title = presentation.title
    pptx.author = 'SocialMind'

    const theme = {
      primary: presentation.theme?.primary || '6366F1',
      secondary: presentation.theme?.secondary || 'A855F7',
      background: presentation.theme?.background || '0F1117',
      text: presentation.theme?.text || 'FFFFFF',
    }

    for (const slide of presentation.slides) {
      const pSlide = pptx.addSlide()
      pSlide.background = { color: theme.background }

      // Speaker notes
      if (slide.speakerNotes) {
        pSlide.addNotes(slide.speakerNotes)
      }

      // Image (if available) - place on right side for content slides
      const hasImage = slide.imageUrl && slide.imageUrl.startsWith('http')
      const hasInlineImage = slide.imageUrl && slide.imageUrl.startsWith('data:')

      switch (slide.type) {
        case 'title': {
          // Center large title
          pSlide.addText(slide.title, {
            x: 0.5, y: 2.5, w: 12.33, h: 1.8,
            fontSize: 56, bold: true, color: theme.text,
            align: 'center', fontFace: 'Inter',
          })
          if (slide.subtitle) {
            pSlide.addText(slide.subtitle, {
              x: 0.5, y: 4.4, w: 12.33, h: 1,
              fontSize: 24, color: theme.primary,
              align: 'center', fontFace: 'Inter',
            })
          }
          // Decorative line
          pSlide.addShape('rect', {
            x: 6.165, y: 5.6, w: 1, h: 0.05,
            fill: { color: theme.primary },
          })
          break
        }
        case 'section': {
          pSlide.addText(slide.title, {
            x: 0.8, y: 2.8, w: 11.7, h: 2,
            fontSize: 64, bold: true, color: theme.primary,
            align: 'left', fontFace: 'Inter',
          })
          if (slide.subtitle) {
            pSlide.addText(slide.subtitle, {
              x: 0.8, y: 4.8, w: 11.7, h: 0.8,
              fontSize: 20, color: theme.text,
              align: 'left', fontFace: 'Inter',
            })
          }
          break
        }
        case 'stats': {
          pSlide.addText(slide.title, {
            x: 0.8, y: 0.5, w: 11.7, h: 0.8,
            fontSize: 28, bold: true, color: theme.text,
            align: 'left', fontFace: 'Inter',
          })
          // Stats as big numbers in grid
          const stats = slide.content || []
          const cols = stats.length <= 2 ? stats.length : (stats.length === 3 ? 3 : 2)
          const rows = Math.ceil(stats.length / cols)
          const cellW = 11.7 / cols
          const cellH = Math.min(2.5, 5.5 / rows)
          stats.forEach((stat, i) => {
            const col = i % cols
            const row = Math.floor(i / cols)
            const [num, ...descParts] = stat.split(':')
            const desc = descParts.join(':').trim()
            pSlide.addText(num.trim(), {
              x: 0.8 + col * cellW, y: 1.7 + row * cellH, w: cellW - 0.3, h: cellH * 0.5,
              fontSize: 56, bold: true, color: theme.primary,
              align: 'center', fontFace: 'Inter',
            })
            if (desc) {
              pSlide.addText(desc, {
                x: 0.8 + col * cellW, y: 1.7 + row * cellH + cellH * 0.5, w: cellW - 0.3, h: cellH * 0.5,
                fontSize: 14, color: theme.text,
                align: 'center', fontFace: 'Inter',
              })
            }
          })
          break
        }
        case 'quote': {
          const quote = slide.content?.[0] || slide.title
          const author = slide.content?.[1] || ''
          pSlide.addText(`"${quote}"`, {
            x: 1, y: 2, w: 11.33, h: 3,
            fontSize: 32, italic: true, color: theme.text,
            align: 'center', fontFace: 'Georgia',
            valign: 'middle',
          })
          if (author) {
            pSlide.addText(`— ${author}`, {
              x: 1, y: 5.2, w: 11.33, h: 0.5,
              fontSize: 18, color: theme.primary,
              align: 'center', fontFace: 'Inter',
            })
          }
          break
        }
        case 'comparison': {
          pSlide.addText(slide.title, {
            x: 0.5, y: 0.5, w: 12.33, h: 0.8,
            fontSize: 28, bold: true, color: theme.text,
            align: 'center', fontFace: 'Inter',
          })
          // Two columns
          const items = slide.content || []
          const left = items.filter((_, i) => i % 2 === 0)
          const right = items.filter((_, i) => i % 2 === 1)
          pSlide.addText(left.join('\n\n'), {
            x: 0.6, y: 1.6, w: 5.9, h: 5,
            fontSize: 16, color: theme.text,
            fontFace: 'Inter',
            paraSpaceBefore: 8,
          })
          pSlide.addText(right.join('\n\n'), {
            x: 6.83, y: 1.6, w: 5.9, h: 5,
            fontSize: 16, color: theme.text,
            fontFace: 'Inter',
            paraSpaceBefore: 8,
          })
          // Divider line
          pSlide.addShape('line', {
            x: 6.665, y: 1.6, w: 0, h: 5,
            line: { color: theme.primary, width: 2 },
          })
          break
        }
        case 'cta': {
          pSlide.addText(slide.title, {
            x: 1, y: 2.5, w: 11.33, h: 1.5,
            fontSize: 48, bold: true, color: theme.primary,
            align: 'center', fontFace: 'Inter',
          })
          if (slide.content && slide.content.length > 0) {
            pSlide.addText(slide.content.join('\n'), {
              x: 1, y: 4.2, w: 11.33, h: 2,
              fontSize: 22, color: theme.text,
              align: 'center', fontFace: 'Inter',
            })
          }
          break
        }
        case 'content':
        default: {
          // Title
          pSlide.addText(slide.title, {
            x: 0.5, y: 0.4, w: hasImage || hasInlineImage ? 7.5 : 12.33, h: 0.8,
            fontSize: 30, bold: true, color: theme.text,
            align: 'left', fontFace: 'Inter',
          })

          // Bullet content
          if (slide.content && slide.content.length > 0) {
            const bulletItems = slide.content.map(c => ({
              text: c,
              options: { bullet: { code: '25CF' }, fontSize: 18, color: theme.text },
            }))
            pSlide.addText(bulletItems, {
              x: 0.6, y: 1.5, w: hasImage || hasInlineImage ? 7.4 : 12.13, h: 5,
              fontFace: 'Inter',
              paraSpaceBefore: 12,
            })
          }

          // Image on right
          if (hasInlineImage && slide.imageUrl) {
            try {
              pSlide.addImage({
                data: slide.imageUrl,
                x: 8.3, y: 1.5, w: 4.5, h: 5,
              })
            } catch {}
          } else if (hasImage && slide.imageUrl) {
            try {
              pSlide.addImage({
                path: slide.imageUrl,
                x: 8.3, y: 1.5, w: 4.5, h: 5,
              })
            } catch {}
          }
          break
        }
      }

      // Footer with slide number (skip title slide)
      if (slide.type !== 'title') {
        pSlide.addText(`${presentation.slides.indexOf(slide) + 1} / ${presentation.slides.length}`, {
          x: 11.5, y: 6.95, w: 1.3, h: 0.3,
          fontSize: 10, color: theme.primary,
          align: 'right', fontFace: 'Inter',
        })
      }
    }

    // Generate base64
    const base64 = await pptx.write({ outputType: 'base64' }) as string
    
    return NextResponse.json({ ok: true, base64, filename: `${presentation.title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx` })
  } catch (err) {
    console.error('PPTX export error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad eksportu' }, { status: 500 })
  }
}
