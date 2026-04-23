import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import type { User } from '@supabase/supabase-js'

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

  type ProfileRow = { id: string; [key: string]: unknown }
  type PermRow = { user_id: string; [key: string]: unknown }
  type ProjectRow = { user_id: string }
  type DraftRow = { user_id: string; created_at: string }

  const profileMap: Record<string, unknown> = Object.fromEntries(
    (profiles as ProfileRow[] || []).map((p) => [p.id, p])
  )
  const permMap: Record<string, unknown> = Object.fromEntries(
    (permissions as PermRow[] || []).map((p) => [p.user_id, p])
  )

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const projectCounts: Record<string, number> = {}
  ;(projects as ProjectRow[] || []).forEach((p) => {
    projectCounts[p.user_id] = (projectCounts[p.user_id] || 0) + 1
  })

  const draftCounts: Record<string, number> = {}
  ;(drafts as DraftRow[] || []).forEach((d) => {
    draftCounts[d.user_id] = (draftCounts[d.user_id] || 0) + 1
  })

  const monthlyDrafts: Record<string, number> = {}
  ;(drafts as DraftRow[] || [])
    .filter((d) => new Date(d.created_at) >= monthStart)
    .forEach((d) => {
      monthlyDrafts[d.user_id] = (monthlyDrafts[d.user_id] || 0) + 1
    })

  const enriched = (users as User[] || []).map((u: User) => ({
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
