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

  const profileMap: Record<string, unknown> = Object.fromEntries(
    (profiles || []).map((p: { id: string }) => [p.id, p])
  )
  const permMap: Record<string, unknown> = Object.fromEntries(
    (permissions || []).map((p: { user_id: string }) => [p.user_id, p])
  )

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const projectCounts: Record<string, number> = {}
  ;(projects || []).forEach((p: { user_id: string }) => {
    projectCounts[p.user_id] = (projectCounts[p.user_id] || 0) + 1
  })

  const draftCounts: Record<string, number> = {}
  ;(drafts || []).forEach((d: { user_id: string }) => {
    draftCounts[d.user_id] = (draftCounts[d.user_id] || 0) + 1
  })

  const monthlyDrafts: Record<string, number> = {}
  ;(drafts || [])
    .filter((d: { created_at: string }) => new Date(d.created_at) >= monthStart)
    .forEach((d: { user_id: string }) => {
      monthlyDrafts[d.user_id] = (monthlyDrafts[d.user_id] || 0) + 1
    })

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
