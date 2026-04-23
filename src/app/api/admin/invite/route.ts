import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { email, plan, note } = await req.json()
  const admin = createAdminClient()

  const { data: invite, error } = await admin.from('invites').insert({
    email: email || null,
    created_by: user.id,
    plan: plan || 'pro',
    note: note || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invite.token}`
  return NextResponse.json({ ok: true, invite, url: inviteUrl })
}
