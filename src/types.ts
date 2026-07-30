export type Status = 'URGENT' | 'APPROACHING' | 'FAR' | 'CLOSED'

export interface Conference {
  id: string
  name: string
  fullName: string
  year: number
  field: string // single-value primary classification
  tags?: string[] // controlled vocabulary slugs, see data/tags.json
  deadline: string // ISO date of paper submission deadline
  abstractDeadline?: string
  tz?: string // defaults to AoE
  location: string
  website?: string
  weight: number // cold-start prior for tile area, until signals accumulate
  featured: boolean
  updatedAt: string // last verified date, shown as data freshness
  archived?: boolean // past editions, excluded from the live treemap
}

export interface AttentionEntry {
  decayed: number // weighted, log-compressed, time-decayed signal sum
  velocity: number // last 7 days vs previous 7 days
}

export interface Attention {
  generatedAt: string | null
  conferences: Record<string, AttentionEntry>
}

export interface TileRect {
  x: number
  y: number
  w: number
  h: number
  conf: Conference
}
