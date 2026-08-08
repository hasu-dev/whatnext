import type { Conference } from '../types'

// Estimated rendered pixel heights of the expanded detail panel's rows at
// the current base.css sizes (.tile__detail 13px/1.6, dt 10.5px, tags
// 12.5px, actions 11px). Tile.tsx gates progressive disclosure on these
// and useTreemap.ts sizes the selected tile from them — one source of
// truth so the two can't drift when the fonts change again.

/** The always-shown block: venue/deadline/website/actions, per this conf's rows. */
export function detailCoreNeed(conf: Conference): number {
  return (
    45 + // venue
    (conf.abstractDeadline ? 45 : 0) +
    66 + // deadline incl. local-time line
    (conf.deadlineNote ? 21 : 0) +
    (conf.nextCycleExpected ? 21 : 0) +
    (conf.website ? 45 : 0) +
    88 // actions row incl. rule + margins
  )
}

export function detailTagsNeed(tagCount: number): number {
  return tagCount > 0 ? 23 + Math.ceil(tagCount / 3) * 30 : 0
}

// 13px text in the narrowest detail-eligible tile (~252px inner width,
// monospace ch ≈ 7.8px) wraps at ~32 chars — not the 38 of the 11px era
export function detailFullNameNeed(fullNameLength: number): number {
  return 23 + Math.ceil(fullNameLength / 32) * 22
}

export const DETAIL_FRESHNESS_NEED = 35
