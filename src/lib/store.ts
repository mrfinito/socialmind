'use client'
import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react'
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

// === SHARED MODULE-LEVEL STATE ===
// All useStore() callers share THIS one state object.
// Without this, each useStore() call had its own React state (independent copies)
// which caused: switchProject only affected one component, others kept showing old project.
let SHARED_STATE: AppState = DEFAULT
let SHARED_READY = false
let SHARED_INITIALIZED = false
const subscribers = new Set<() => void>()

function getSnapshot(): AppState { return SHARED_STATE }
function getReadySnapshot(): boolean { return SHARED_READY }
function subscribe(cb: () => void): () => void {
  subscribers.add(cb)
  return () => { subscribers.delete(cb) }
}
function setSharedState(updater: AppState | ((prev: AppState) => AppState)) {
  const next = typeof updater === 'function' ? (updater as (p: AppState) => AppState)(SHARED_STATE) : updater
  if (next === SHARED_STATE) return
  SHARED_STATE = next
  subscribers.forEach(cb => cb())
}
function setSharedReady(ready: boolean) {
  if (SHARED_READY === ready) return
  SHARED_READY = ready
  subscribers.forEach(cb => cb())
}

export function useStore() {
  // Subscribe to shared state — every useStore() call sees the same data
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const ready = useSyncExternalStore(subscribe, getReadySnapshot, getReadySnapshot)
  const supabase = createClient()

  // Init only ONCE across the whole app (not once per component)
  useEffect(() => {
    if (SHARED_INITIALIZED) return
    SHARED_INITIALIZED = true

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSharedReady(true); return }

      // Load projects
      const { data: projects } = await supabase
        .from('projects').select('*').order('created_at', { ascending: true })

      // Load drafts
      const { data: drafts } = await supabase
        .from('drafts').select('*').order('created_at', { ascending: false }).limit(200)

      // Load materials (without data_url for performance — load on demand)
      const { data: materials } = await supabase
        .from('materials').select('id,name,type,size,project_id,created_at').order('created_at', { ascending: false })

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

      // Try to restore last-active project from localStorage (cross-tab sync)
      let lastActive = ''
      try { lastActive = localStorage.getItem('sm:active-project') || '' } catch {}
      const validLastActive = mappedProjects.find(p => p.id === lastActive)?.id || ''
      const firstProjectId = validLastActive || mappedProjects[0]?.id || ''

      setSharedState({
        user: { id: user.id, email: user.email || '', name: user.user_metadata?.full_name },
        activeProjectId: firstProjectId,
        projects: mappedProjects,
        drafts: mappedDrafts,
        materials: mappedMaterials,
      })
      setSharedReady(true)
    }

    init()
  }, [supabase])

  // Computed (derived from shared state, so identical for everyone)
  const activeProject = state.projects.find(p => p.id === state.activeProjectId) || state.projects[0]
  const dna = activeProject?.dna || null
  const selectedPlatforms = activeProject?.selectedPlatforms || ['facebook','instagram']
  const projectDrafts = state.drafts.filter(d => d.projectId === state.activeProjectId)
  const projectMaterials = state.materials.filter(m => !m.projectId || m.projectId === state.activeProjectId)

  // ── Project actions ────────────────────────────────────────
  const saveDNA = useCallback(async (dna: BrandDNA) => {
    if (!SHARED_STATE.activeProjectId) return
    await supabase.from('projects').update({
      dna, updated_at: new Date().toISOString()
    }).eq('id', SHARED_STATE.activeProjectId)
    setSharedState(prev => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === prev.activeProjectId ? { ...p, dna } : p
      )
    }))
  }, [supabase])

  const savePlatforms = useCallback(async (platforms: Platform[]) => {
    const projectId = SHARED_STATE.activeProjectId
    if (!projectId) return
    // Optimistic update
    setSharedState(prev => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === projectId ? { ...p, selectedPlatforms: platforms } : p
      )
    }))
    const { error } = await supabase.from('projects').update({
      selected_platforms: platforms, updated_at: new Date().toISOString()
    }).eq('id', projectId)
    if (error) {
      console.error('savePlatforms DB error:', error)
      alert('Nie udało się zapisać platformy. Spróbuj ponownie.')
    }
  }, [supabase])

  const createProject = useCallback(async (name: string, client?: string, emoji?: string, color?: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return ''
    const { data, error } = await supabase.from('projects').insert({
      user_id: user.id, name, client,
      emoji: emoji || PROJECT_EMOJIS[Math.floor(Math.random()*PROJECT_EMOJIS.length)],
      color: color || PROJECT_COLORS[Math.floor(Math.random()*PROJECT_COLORS.length)],
      selected_platforms: ['facebook','instagram'],
    }).select().single()
    if (error || !data) {
      console.error('createProject DB error:', error)
      return ''
    }
    const newProject: Project = {
      id: data.id, name: data.name, client: data.client,
      emoji: data.emoji, color: data.color,
      selectedPlatforms: data.selected_platforms,
      createdAt: data.created_at,
    }
    // Set as active immediately
    setSharedState(prev => ({
      ...prev,
      projects: [...prev.projects, newProject],
      activeProjectId: data.id,
    }))
    try { localStorage.setItem('sm:active-project', data.id) } catch {}
    return data.id
  }, [supabase])

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.name) dbUpdates.name = updates.name
    if (updates.client !== undefined) dbUpdates.client = updates.client
    if (updates.emoji) dbUpdates.emoji = updates.emoji
    if (updates.color) dbUpdates.color = updates.color
    if (updates.selectedPlatforms) dbUpdates.selected_platforms = updates.selectedPlatforms
    dbUpdates.updated_at = new Date().toISOString()
    await supabase.from('projects').update(dbUpdates).eq('id', id)
    setSharedState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, ...updates } : p)
    }))
  }, [supabase])

  const deleteProject = useCallback(async (id: string) => {
    await supabase.from('projects').delete().eq('id', id)
    setSharedState(prev => {
      const remaining = prev.projects.filter(p => p.id !== id)
      const newActive = prev.activeProjectId === id ? (remaining[0]?.id || '') : prev.activeProjectId
      try {
        if (newActive) localStorage.setItem('sm:active-project', newActive)
        else localStorage.removeItem('sm:active-project')
      } catch {}
      return {
        ...prev,
        projects: remaining,
        activeProjectId: newActive,
        drafts: prev.drafts.filter(d => d.projectId !== id),
      }
    })
  }, [supabase])

  const switchProject = useCallback((id: string) => {
    setSharedState(prev => ({ ...prev, activeProjectId: id }))
    try { localStorage.setItem('sm:active-project', id) } catch {}
  }, [])

  // ── Draft actions ──────────────────────────────────────────
  const savePost = useCallback(async (data: {
    topic: string; platforms: Platform[]; content: GeneratedContent;
    dna?: BrandDNA; goals?: string[]; tones?: string[]
  }) => {
    const projectId = SHARED_STATE.activeProjectId
    if (!projectId) return ''
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return ''
    const { data: row, error } = await supabase.from('drafts').insert({
      user_id: user.id,
      project_id: projectId,
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
    setSharedState(prev => ({ ...prev, drafts: [newDraft, ...prev.drafts] }))
    return row.id
  }, [supabase])

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
    setSharedState(prev => ({
      ...prev,
      drafts: prev.drafts.map(d => d.id === id ? {
        ...d, ...updates, updatedAt: new Date().toISOString()
      } : d)
    }))
  }, [supabase])

  const deleteDraft = useCallback(async (id: string) => {
    await supabase.from('drafts').delete().eq('id', id)
    setSharedState(prev => ({ ...prev, drafts: prev.drafts.filter(d => d.id !== id) }))
  }, [supabase])

  const scheduleDraft = useCallback((id: string, scheduledAt: string) => {
    updateDraft(id, { scheduledAt, status: 'scheduled' })
  }, [updateDraft])

  const markPublished = useCallback((id: string) => {
    updateDraft(id, { publishedAt: new Date().toISOString(), status: 'published' })
  }, [updateDraft])

  // ── Material actions ───────────────────────────────────────
  const addMaterial = useCallback(async (m: { name: string; type: string; size: string; dataUrl?: string }) => {
    const projectId = SHARED_STATE.activeProjectId
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !projectId) return
    const { data: row } = await supabase.from('materials').insert({
      user_id: user.id,
      project_id: projectId,
      name: m.name, type: m.type, size: m.size,
      data_url: m.dataUrl,
    }).select('id,name,type,size,project_id,created_at').single()
    if (!row) return
    setSharedState(prev => ({
      ...prev,
      materials: [{ id: row.id, name: row.name, type: row.type, size: row.size, projectId: row.project_id, addedAt: row.created_at }, ...prev.materials]
    }))
  }, [supabase])

  const deleteMaterial = useCallback(async (id: string) => {
    await supabase.from('materials').delete().eq('id', id)
    setSharedState(prev => ({ ...prev, materials: prev.materials.filter(m => m.id !== id) }))
  }, [supabase])

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
