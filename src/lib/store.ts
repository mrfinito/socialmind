'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from './supabase'
import type { BrandDNA, Platform, GeneratedContent, PostStatus, Project, PostDraft } from './types'
import { PROJECT_COLORS, PROJECT_EMOJIS } from './types'

// Re-export types for backward compat
export type { PostDraft, Project }

export interface AppState {
  user: { id: string; email: string; name?: string } | null
  activeProjectId: string
  projects: Project[]
  drafts: PostDraft[]
  materials: { id: string; name: string; type: string; size: string; dataUrl?: string; addedAt: string; projectId?: string }[]
}

const DEFAULT: AppState = {
  user: null,
  activeProjectId: '',
  projects: [],
  drafts: [],
  materials: [],
}

export function useStore() {
  const [state, setState] = useState<AppState>(DEFAULT)
  const [ready, setReady] = useState(false)
  const supabase = createClient()
  const initialized = useRef(false)

  // Load everything from Supabase on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setReady(true); return }

      // Load projects
      const { data: projects } = await supabase
        .from('projects').select('*').order('created_at', { ascending: true })

      // Load drafts
      const { data: drafts } = await supabase
        .from('drafts').select('*').order('created_at', { ascending: false }).limit(200)

      // Load materials (without data_url for performance — load on demand)
      const { data: materials } = await supabase
        .from('materials').select('id,name,type,size,project_id,created_at').order('created_at', { ascending: false })

      // Load user permissions/limits
      const { data: userPerms } = await supabase
        .from('user_permissions').select('max_projects,max_posts_per_month').eq('user_id', user.id).maybeSingle()

      const mappedProjects: Project[] = (projects || []).map(p => ({
        id: p.id, name: p.name, client: p.client,
        emoji: p.emoji || '🏢', color: p.color || '#6366f1',
        selectedPlatforms: p.selected_platforms || ['facebook','instagram'],
        dna: p.dna, createdAt: p.created_at,
      }))

      const mappedDrafts: PostDraft[] = (drafts || []).map(d => ({
        id: d.id, projectId: d.project_id, status: d.status,
        topic: d.topic, platforms: d.platforms || [],
        goals: d.goals || [], tones: d.tones || [],
        content: d.content, dna: d.dna, notes: d.notes,
        scheduledAt: d.scheduled_at, publishedAt: d.published_at,
        createdAt: d.created_at, updatedAt: d.updated_at,
      }))

      const mappedMaterials = (materials || []).map(m => ({
        id: m.id, name: m.name, type: m.type, size: m.size,
        projectId: m.project_id, addedAt: m.created_at,
      }))

      const firstProjectId = mappedProjects[0]?.id || ''

      setState({
        user: { id: user.id, email: user.email || '', name: user.user_metadata?.full_name },
        activeProjectId: firstProjectId,
        projects: mappedProjects,
        drafts: mappedDrafts,
        materials: mappedMaterials,
      })
      setReady(true)
    }

    init()
  }, [])

  // Computed
  const activeProject = state.projects.find(p => p.id === state.activeProjectId) || state.projects[0]
  const dna = activeProject?.dna || null
  const selectedPlatforms = activeProject?.selectedPlatforms || ['facebook','instagram']
  const projectDrafts = state.drafts.filter(d => d.projectId === state.activeProjectId)
  const projectMaterials = state.materials.filter(m => !m.projectId || m.projectId === state.activeProjectId)

  // ── Project actions ────────────────────────────────────────
  const saveDNA = useCallback(async (dna: BrandDNA) => {
    if (!state.activeProjectId) return
    await supabase.from('projects').update({
      dna, updated_at: new Date().toISOString()
    }).eq('id', state.activeProjectId)
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === prev.activeProjectId ? { ...p, dna } : p
      )
    }))
  }, [state.activeProjectId])

  const savePlatforms = useCallback(async (platforms: Platform[]) => {
    if (!state.activeProjectId) return
    await supabase.from('projects').update({
      selected_platforms: platforms, updated_at: new Date().toISOString()
    }).eq('id', state.activeProjectId)
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === prev.activeProjectId ? { ...p, selectedPlatforms: platforms } : p
      )
    }))
  }, [state.activeProjectId])

  const createProject = useCallback(async (name: string, client?: string, emoji?: string, color?: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return ''
    const { data, error } = await supabase.from('projects').insert({
      user_id: user.id, name, client,
      emoji: emoji || PROJECT_EMOJIS[Math.floor(Math.random()*PROJECT_EMOJIS.length)],
      color: color || PROJECT_COLORS[Math.floor(Math.random()*PROJECT_COLORS.length)],
      selected_platforms: ['facebook','instagram'],
    }).select().single()
    if (error || !data) return ''
    const newProject: Project = {
      id: data.id, name: data.name, client: data.client,
      emoji: data.emoji, color: data.color,
      selectedPlatforms: data.selected_platforms,
      createdAt: data.created_at,
    }
    setState(prev => ({
      ...prev,
      projects: [...prev.projects, newProject],
      activeProjectId: data.id,
    }))
    return data.id
  }, [])

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.name) dbUpdates.name = updates.name
    if (updates.client !== undefined) dbUpdates.client = updates.client
    if (updates.emoji) dbUpdates.emoji = updates.emoji
    if (updates.color) dbUpdates.color = updates.color
    if (updates.selectedPlatforms) dbUpdates.selected_platforms = updates.selectedPlatforms
    dbUpdates.updated_at = new Date().toISOString()
    await supabase.from('projects').update(dbUpdates).eq('id', id)
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, ...updates } : p)
    }))
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    await supabase.from('projects').delete().eq('id', id)
    setState(prev => {
      const remaining = prev.projects.filter(p => p.id !== id)
      return {
        ...prev,
        projects: remaining,
        activeProjectId: prev.activeProjectId === id ? (remaining[0]?.id || '') : prev.activeProjectId,
        drafts: prev.drafts.filter(d => d.projectId !== id),
      }
    })
  }, [])

  const switchProject = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeProjectId: id }))
  }, [])

  // ── Draft actions ──────────────────────────────────────────
  const savePost = useCallback(async (data: {
    topic: string; platforms: Platform[]; content: GeneratedContent;
    dna?: BrandDNA; goals?: string[]; tones?: string[]
  }) => {
    if (!state.activeProjectId) return ''
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return ''
    const { data: row, error } = await supabase.from('drafts').insert({
      user_id: user.id,
      project_id: state.activeProjectId,
      status: 'draft',
      topic: data.topic,
      platforms: data.platforms,
      goals: data.goals || [],
      tones: data.tones || [],
      content: data.content,
      dna: data.dna,
    }).select().single()
    if (error || !row) return ''
    const newDraft: PostDraft = {
      id: row.id, projectId: row.project_id, status: row.status,
      topic: row.topic, platforms: row.platforms || [],
      goals: row.goals || [], tones: row.tones || [],
      content: row.content, dna: row.dna,
      createdAt: row.created_at, updatedAt: row.updated_at,
    }
    setState(prev => ({ ...prev, drafts: [newDraft, ...prev.drafts] }))
    return row.id
  }, [state.activeProjectId])

  const saveDraft = savePost

  const updateDraft = useCallback(async (id: string, updates: Partial<PostDraft>) => {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.topic !== undefined) dbUpdates.topic = updates.topic
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes
    if (updates.scheduledAt !== undefined) dbUpdates.scheduled_at = updates.scheduledAt
    if (updates.publishedAt !== undefined) dbUpdates.published_at = updates.publishedAt
    if (updates.content !== undefined) dbUpdates.content = updates.content
    dbUpdates.updated_at = new Date().toISOString()
    await supabase.from('drafts').update(dbUpdates).eq('id', id)
    setState(prev => ({
      ...prev,
      drafts: prev.drafts.map(d => d.id === id ? {
        ...d, ...updates, updatedAt: new Date().toISOString()
      } : d)
    }))
  }, [])

  const deleteDraft = useCallback(async (id: string) => {
    await supabase.from('drafts').delete().eq('id', id)
    setState(prev => ({ ...prev, drafts: prev.drafts.filter(d => d.id !== id) }))
  }, [])

  const scheduleDraft = useCallback((id: string, scheduledAt: string) => {
    updateDraft(id, { scheduledAt, status: 'scheduled' })
  }, [updateDraft])

  const markPublished = useCallback((id: string) => {
    updateDraft(id, { publishedAt: new Date().toISOString(), status: 'published' })
  }, [updateDraft])

  // ── Material actions ───────────────────────────────────────
  const addMaterial = useCallback(async (m: { name: string; type: string; size: string; dataUrl?: string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !state.activeProjectId) return
    const { data: row } = await supabase.from('materials').insert({
      user_id: user.id,
      project_id: state.activeProjectId,
      name: m.name, type: m.type, size: m.size,
      data_url: m.dataUrl,
    }).select('id,name,type,size,project_id,created_at').single()
    if (!row) return
    setState(prev => ({
      ...prev,
      materials: [{ id: row.id, name: row.name, type: row.type, size: row.size, projectId: row.project_id, addedAt: row.created_at }, ...prev.materials]
    }))
  }, [state.activeProjectId])

  const deleteMaterial = useCallback(async (id: string) => {
    await supabase.from('materials').delete().eq('id', id)
    setState(prev => ({ ...prev, materials: prev.materials.filter(m => m.id !== id) }))
  }, [])

  return {
    state, ready,
    activeProject, dna, selectedPlatforms,
    projectDrafts, projectMaterials,
    // project
    saveDNA, savePlatforms,
    createProject, updateProject, deleteProject, switchProject,
    // drafts
    savePost, saveDraft, updateDraft, deleteDraft, scheduleDraft, markPublished,
    // materials
    addMaterial, deleteMaterial,
    // compat
    savedPosts: projectDrafts,
    update: () => {},
  }
}
