export type Status = 'URGENT' | 'APPROACHING' | 'FAR' | 'CLOSED'

export interface Conference {
  id: string
  name: string
  fullName: string
  year: number
  field: string
  deadline: string // ISO date of paper submission deadline
  location: string
  website?: string
  weight: number // relative heat / prominence, drives treemap area
  featured: boolean // rendered as inverted (accent-filled) tile
}

export interface TileRect {
  x: number
  y: number
  w: number
  h: number
  conf: Conference
}
