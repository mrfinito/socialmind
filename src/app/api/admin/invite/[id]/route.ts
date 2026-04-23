import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return p?.is_admin ? user : null
}

// DELETE — usuń zaproszenie
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('invites').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH — anuluj (ustaw expires_at na przeszłość) lub przedłuż
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { action } = await req.json()
  const adminClient = createAdminClient()

  let updates: Record<string, string> = {}
  if (action === 'cancel') {
    updates = { expires_at: new Date(Date.now() - 1000).toISOString() }
  } else if (action === 'extend') {
    updates = { expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
  } else if (action === 'resend') {
    updates = { expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
  }

  const { error } = await adminClient.from('invites').update(updates).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
