import { useMemo } from 'react'
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import type { Attention, Conference, TileRect } from '../types'

interface Args {
  conferences: Conference[]
  width: number
  height: number
  selectedId: string | null
  gap: number
  attention: Attention | null
}

// A conference with this much decayed signal fully trusts behavior over
// the editorial weight prior. Signals are already log-compressed upstream.
const SATURATION = 20

/**
 * Rough pixel height the expanded detail needs for THIS conference —
 * header + name + every detail row it will actually render. The boost
 * loop steers the selected tile's height toward this, so the card tends
 * to fit its content: not clipped, not cavernous.
 */
export function estimateDetailHeight(conf: Conference): number {
  let px = 24 /* padding */ + 26 /* header row */ + 66 /* name */ + 8
  px += 20 + Math.ceil(conf.fullName.length / 38) * 19 // full name
  px += 39 // venue
  if (conf.abstractDeadline) px += 39
  px += 39 // deadline
  if (conf.website) px += 39
  const tagCount = conf.tags?.length ?? 0
  if (tagCount > 0) px += 20 + Math.ceil(tagCount / 3) * 33
  px += 20 + 33 // actions row
  px += 24 // freshness
  return Math.round(px * 1.08) // small safety margin
}

/**
 * Tile area value: `weight` is only a cold-start prior. As decayed
 * attention accumulates for a conference, its area shifts toward the
 * behavioral signal (normalized against the current maximum so the map
 * stays comparative, not an absolute popularity chart).
 */
function areaValue(conf: Conference, attention: Attention | null, maxDecayed: number, maxWeight: number): number {
  const att = attention?.conferences[conf.id]
  if (!att || maxDecayed <= 0) return conf.weight
  const alpha = Math.min(1, att.decayed / SATURATION)
  const behavioral = (att.decayed / maxDecayed) * maxWeight * 1.4
  return (1 - alpha) * conf.weight + alpha * behavioral
}

export function useTreemap({ conferences, width, height, selectedId, gap, attention }: Args): TileRect[] {
  return useMemo(() => {
    if (!width || !height || conferences.length === 0) return []

    const maxWeight = Math.max(...conferences.map((c) => c.weight))
    const maxDecayed = Math.max(0, ...conferences.map((c) => attention?.conferences[c.id]?.decayed ?? 0))
    const values = new Map(conferences.map((c) => [c.id, areaValue(c, attention, maxDecayed, maxWeight)]))
    const maxValue = Math.max(...values.values())

    type Leaf = { x0: number; y0: number; x1: number; y1: number; data: Conference }

    const layout = (selectedValue: number | null): Leaf[] => {
      const root = hierarchy<{ children: Conference[] } | Conference>({ children: conferences }).sum((d) => {
        const conf = d as Conference
        if (!conf.weight) return 0
        if (conf.id === selectedId && selectedValue !== null) return selectedValue
        return values.get(conf.id) ?? conf.weight
      })
      treemap<{ children: Conference[] } | Conference>()
        .tile(treemapSquarify.ratio(1.35))
        .size([width, height])
        .paddingInner(gap)
        .round(true)(root)
      return root.leaves() as unknown as Leaf[]
    }

    let leaves: Leaf[]
    if (!selectedId || !values.has(selectedId)) {
      leaves = layout(null)
    } else {
      // steer the selected tile's height toward its content height:
      // too short → boost up; far too tall → boost down. Bounded by a
      // focus floor (still clearly the largest tile) and half the map.
      const selConf = conferences.find((c) => c.id === selectedId)!
      const base = values.get(selectedId)!
      const total = [...values.values()].reduce((a, b) => a + b, 0)
      const floor = Math.max(base * 2, maxValue * 1.15)
      const cap = Math.max(floor, total - base) // ≈ 50% of the map
      const targetH = Math.min(height * 0.85, estimateDetailHeight(selConf))

      let boost = Math.min(Math.max(base * 4, maxValue * 1.3), cap)
      leaves = layout(boost)
      for (let i = 0; i < 7; i++) {
        const sel = leaves.find((l) => l.data.id === selectedId)
        if (!sel) break
        const selH = sel.y1 - sel.y0
        if (selH < targetH && boost < cap) {
          boost = Math.min(boost * 1.45, cap)
        } else if (selH > targetH * 1.35 && boost > floor * 1.02) {
          boost = Math.max(boost * 0.7, floor)
        } else {
          break
        }
        leaves = layout(boost)
      }
    }

    return leaves.map((leaf) => ({
      x: leaf.x0,
      y: leaf.y0,
      w: leaf.x1 - leaf.x0,
      h: leaf.y1 - leaf.y0,
      conf: leaf.data,
    }))
  }, [conferences, width, height, selectedId, gap, attention])
}
