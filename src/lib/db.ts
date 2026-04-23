// Database operations — thin wrappers around Supabase queries
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BrandDNA, Platform, GeneratedContent, PostStatus } from './types'

export interface DbProject {
  id: string; user_id: string; name: string; client?: string
  emoji: string; color: string; selected_platforms: Platform[]
  dna?: BrandDNA; created_at: string; updated_at: string
}

export interface DbDraft {
  id: string; user_id: string; project_id: string; status: PostStatus
  topic: string; platforms: Platform[]; goals: string[]; tones: string[]
  content: GeneratedContent; dna?: BrandDNA; notes?: string
  scheduled_at?: string; published_at?: string
  created_at: string; updated_at: string
}

export interface DbMaterial {
  id: string; user_id: string; project_id?: string
  name: string; type: string; size: string; data_url?: string; created_at: string
}

export interface DbProfile {
  id: string; email: string; full_name?: string
  avatar_url?: string; plan: 'free'|'pro'|'agency'
  created_at: string; updated_at: string
}

type Sb = SupabaseClient

export async function getProjects(sb: Sb) {
  const { data, error } = await sb.from('projects').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data as DbProject[]
}

export async function createProject(sb: Sb, project: Partial<DbProject>) {
  const { data, error } = await sb.from('projects').insert(project).select().single()
  if (error) throw error
  return data as DbProject
}

export async function updateProject(sb: Sb, id: string, updates: Partial<DbProject>) {
  const { data, error } = await sb.from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data as DbProject
}

export async function deleteProject(sb: Sb, id: string) {
  const { error } = await sb.from('projects').delete().eq('id', id)
  if (error) throw error
}

export async function getDrafts(sb: Sb, projectId: string) {
  const { data, error } = await sb.from('drafts').select('*')
    .eq('project_id', projectId).order('created_at', { ascending: false })
  if (error) throw error
  return data as DbDraft[]
}

export async function createDraft(sb: Sb, draft: Partial<DbDraft>) {
  const { data, error } = await sb.from('drafts').insert(draft).select().single()
  if (error) throw error
  return data as DbDraft
}

export async function updateDraft(sb: Sb, id: string, updates: Partial<DbDraft>) {
  const { data, error } = await sb.from('drafts')
    .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data as DbDraft
}

export async function deleteDraft(sb: Sb, id: string) {
  const { error } = await sb.from('drafts').delete().eq('id', id)
  if (error) throw error
}

export async function getMaterials(sb: Sb, projectId?: string) {
  let q = sb.from('materials').select('*').order('created_at', { ascending: false })
  if (projectId) q = q.eq('project_id', projectId)
  const { data, error } = await q
  if (error) throw error
  return data as DbMaterial[]
}

export async function createMaterial(sb: Sb, material: Partial<DbMaterial>) {
  const { data, error } = await sb.from('materials').insert(material).select().single()
  if (error) throw error
  return data as DbMaterial
}

export async function deleteMaterial(sb: Sb, id: string) {
  const { error } = await sb.from('materials').delete().eq('id', id)
  if (error) throw error
}
