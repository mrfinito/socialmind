import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return p?.is_admin ? user : null
}

export async function GET() {
  try {
    const admin = await checkAdmin()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const adminClient = createAdminClient()

    // Try to read from activity_log table (graceful fallback if table doesn't exist)
    const { data, error } = await adminClient
      .from('activity_log')
      .select('id, user_id, action, details, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    // If table doesn't exist - return empty array (front shows "Brak zdarzeń")
    if (error) {
      console.warn('activity_log read failed:', error.message)
      return NextResponse.json({ entries: [], _note: 'Tabela activity_log nie istnieje. Patrz docs/SQL_MIGRATION.md' })
    }

    // Enrich with user email
    if (!data || data.length === 0) {
      return NextResponse.json({ entries: [] })
    }

    const userIds = Array.from(new Set(data.map((e: { user_id: string }) => e.user_id).filter(Boolean)))
    const { data: users } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    const emailMap = new Map<string, string>()
    if (users?.users) {
      for (const u of users.users) {
        if (userIds.includes(u.id)) emailMap.set(u.id, u.email || '')
      }
    }

    const entries = data.map((e: { id: string; user_id: string; action: string; details?: string; metadata?: Record<string, unknown>; created_at: string }) => ({
      ...e,
      user_email: emailMap.get(e.user_id) || '',
    }))

    return NextResponse.json({ entries })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown'
    console.error('activity-log error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST - log a new entry (called from other places in app)
export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const { action, details, metadata } = await req.json() as {
      action: string
      details?: string
      metadata?: Record<string, unknown>
    }

    if (!action) return NextResponse.json({ ok: false }, { status: 400 })

    const adminClient = createAdminClient()
    const { error } = await adminClient.from('activity_log').insert({
      user_id: user.id,
      action,
      details: details || null,
      metadata: metadata || null,
    })

    // Silently ignore if table doesn't exist
    if (error && !error.message.includes('does not exist')) {
      console.warn('activity_log insert failed:', error.message)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
