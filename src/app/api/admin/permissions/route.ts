import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return p?.is_admin ? user : null
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { userId, permissions } = await req.json()
  const adminClient = createAdminClient()

  const { error } = await adminClient.from('user_permissions').upsert({
    user_id: userId,
    ...permissions,
    updated_at: new Date().toISOString(),
    updated_by: admin.id,
  }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
