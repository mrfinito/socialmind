import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// Public endpoint - uses token, no auth required
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Brak tokenu' }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('client_briefs')
      .select('id, token, business_name, client_name, status, expires_at, responses')
      .eq('token', token)
      .maybeSingle()

    if (error || !data) return NextResponse.json({ error: 'Brief nie istnieje' }, { status: 404 })
    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link wygasł' }, { status: 410 })
    }

    return NextResponse.json({ ok: true, brief: data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad' }, { status: 500 })
  }
}
