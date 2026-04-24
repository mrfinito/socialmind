import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// Public endpoint - client submits brief using token
export async function POST(req: NextRequest) {
  try {
    const { token, responses } = await req.json()
    if (!token || !responses) return NextResponse.json({ error: 'Brak danych' }, { status: 400 })

    const admin = createAdminClient()
    const { data: brief } = await admin
      .from('client_briefs')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (!brief) return NextResponse.json({ error: 'Brief nie istnieje' }, { status: 404 })
    if (brief.status === 'submitted' || brief.status === 'processed') {
      return NextResponse.json({ error: 'Brief już został wypełniony' }, { status: 400 })
    }
    if (new Date(brief.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link wygasł' }, { status: 410 })
    }

    const { error } = await admin
      .from('client_briefs')
      .update({
        responses,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('token', token)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad' }, { status: 500 })
  }
}
