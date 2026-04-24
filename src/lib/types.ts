export interface BrandVisuals {
  logoUrl?: string
  logoFileName?: string
  dominantColors: string[]
  fontStyle?: string
  visualStyle?: string
  brandingNotes: string
  logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  logoSizePercent?: number
}

export interface BrandDNA {
  industry: string
  persona: string
  values: string
  usp: string
  tone: string
  keywords: string
  masterPrompt: string
  dominantColors?: string[]
  brandName?: string
  brandShort?: string
  visuals?: BrandVisuals
}

export interface BrandingOptions {
  addLogoOverlay: boolean
  addTextOverlay: boolean
  overlayText: string
  overlayTextPosition: 'top' | 'bottom' | 'center'
  overlayTextColor: string
  overlayFontSize: number
}

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'archived'

export interface PostDraft {
  id: string
  projectId: string
  createdAt: string
  updatedAt: string
  scheduledAt?: string
  publishedAt?: string
  status: PostStatus
  topic: string
  platforms: Platform[]
  goals: string[]
  tones: string[]
  content: GeneratedContent
  dna?: BrandDNA
  notes?: string
}

export interface Project {
  id: string
  name: string
  client?: string
  color: string
  emoji: string
  createdAt: string
  dna?: BrandDNA
  selectedPlatforms: Platform[]
  isActive?: boolean
}

export interface ImageIteration {
  url: string
  prompt: string
  revisionNote?: string
  createdAt: string
}

export interface GeneratedPost {
  text: string
  imagePrompt: string
  generatedImageUrl?: string
  editedImageUrl?: string
  imageIterations?: ImageIteration[]
  activeIterationIdx?: number
}

export interface GeneratedContent {
  brandName: string
  brandShort: string
  facebook?: GeneratedPost
  instagram?: GeneratedPost
  linkedin?: GeneratedPost
  x?: GeneratedPost
  pinterest?: GeneratedPost
  tiktok?: GeneratedPost
}

export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'x' | 'pinterest' | 'tiktok'

export interface PlatformConfig {
  id: Platform
  name: string
  emoji: string
  dimensions: string
  maxChars: number
  format: string
  color: string
}

export const PLATFORMS: PlatformConfig[] = [
  { id: 'facebook',  name: 'Facebook',  emoji: '📘', dimensions: '1200×630',  maxChars: 500,  format: 'Post / Karuzela / Reel', color: '#1877F2' },
  { id: 'instagram', name: 'Instagram', emoji: '📷', dimensions: '1080×1080', maxChars: 2200, format: 'Feed / Stories / Reel',  color: '#E1306C' },
  { id: 'linkedin',  name: 'LinkedIn',  emoji: '💼', dimensions: '1200×627',  maxChars: 3000, format: 'Post / Artykuł',         color: '#0A66C2' },
  { id: 'x',        name: 'X (Twitter)',emoji: '✖',  dimensions: '1600×900',  maxChars: 280,  format: 'Tweet / Thread',         color: '#000000' },
  { id: 'pinterest', name: 'Pinterest', emoji: '📌', dimensions: '1000×1500', maxChars: 500,  format: 'Pin / Idea Pin',          color: '#E60023' },
  { id: 'tiktok',   name: 'TikTok',    emoji: '🎵', dimensions: '1080×1920', maxChars: 2200, format: 'Video / skrypt',          color: '#010101' },
]

export const PROJECT_COLORS = ['#6366f1','#a855f7','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6']
export const PROJECT_EMOJIS = ['🏢','🏪','🎨','🚀','💡','🌿','🎯','⚡','🔥','💎','🌟','🎭']
