import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { userId, plan, is_admin } = await req.json()
  const admin = createAdminClient()

  const updates: Record<string,unknown> = {}
  if (plan) updates.plan = plan
  if (typeof is_admin === 'boolean') updates.is_admin = is_admin

  const { error } = await admin.from('profiles').update(updates).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
