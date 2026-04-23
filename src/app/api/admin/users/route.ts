import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? user : null
}

export async function GET() {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const adminClient = createAdminClient()
  const { data: { users } } = await adminClient.auth.admin.listUsers()
  const { data: profiles } = await adminClient.from('profiles').select('*')
  const { data: permissions } = await adminClient.from('user_permissions').select('*')
  const { data: projects } = await adminClient.from('projects').select('user_id')
  const { data: drafts } = await adminClient.from('drafts').select('user_id, created_at')
  const { data: invites } = await adminClient.from('invites').select('*').order('created_at', { ascending: false })

  const profileMap = Object.fromEntries((profiles || []).map((p: Record<string,unknown>) => [p.id, p]))
  const permMap = Object.fromEntries((permissions || []).map((p: Record<string,unknown>) => [p.user_id, p]))

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const projectCounts = (projects || []).reduce((acc: Record<string,number>, p) => {
    acc[p.user_id] = (acc[p.user_id] || 0) + 1; return acc
  }, {})
  const draftCounts = (drafts || []).reduce((acc: Record<string,number>, d) => {
    acc[d.user_id] = (acc[d.user_id] || 0) + 1; return acc
  }, {})
  const monthlyDrafts = (drafts || []).filter(d => new Date(d.created_at) >= monthStart)
    .reduce((acc: Record<string,number>, d) => {
      acc[d.user_id] = (acc[d.user_id] || 0) + 1; return acc
    }, {})

  const enriched = (users || []).map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in: u.last_sign_in_at,
    provider: u.app_metadata?.provider || 'email',
    profile: profileMap[u.id] || {},
    permissions: permMap[u.id] || null,
    projects: projectCounts[u.id] || 0,
    drafts: draftCounts[u.id] || 0,
    monthly_drafts: monthlyDrafts[u.id] || 0,
  }))

  return NextResponse.json({ users: enriched, invites: invites || [] })
}
