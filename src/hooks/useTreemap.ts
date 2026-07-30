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

/**
 * Computes treemap rectangles with d3. The selected conference gets its
 * layout weight boosted so it expands in place; framer-motion animates
 * every tile toward its new rect.
 */
export function useTreemap({ conferences, width, height, selectedId, gap, attention }: Args): TileRect[] {
  return useMemo(() => {
    if (!width || !height || conferences.length === 0) return []

    const maxWeight = Math.max(...conferences.map((c) => c.weight))
    const maxDecayed = Math.max(0, ...conferences.map((c) => attention?.conferences[c.id]?.decayed ?? 0))
    const values = new Map(conferences.map((c) => [c.id, areaValue(c, attention, maxDecayed, maxWeight)]))
    const maxValue = Math.max(...values.values())

    // selection boost: ×4, but never less than 1.3× the current largest
    // tile, so even a low-weight venue expands with room for its detail
    const root = hierarchy<{ children: Conference[] } | Conference>({ children: conferences })
      .sum((d) => {
        const conf = d as Conference
        if (!conf.weight) return 0
        const v = values.get(conf.id) ?? conf.weight
        return conf.id === selectedId ? Math.max(v * 4, maxValue * 1.3) : v
      })

    treemap<{ children: Conference[] } | Conference>()
      .tile(treemapSquarify.ratio(1.35))
      .size([width, height])
      .paddingInner(gap)
      .round(true)(root)

    return (root.leaves() as unknown as Array<{ x0: number; y0: number; x1: number; y1: number; data: Conference }>).map(
      (leaf) => ({
        x: leaf.x0,
        y: leaf.y0,
        w: leaf.x1 - leaf.x0,
        h: leaf.y1 - leaf.y0,
        conf: leaf.data,
      }),
    )
  }, [conferences, width, height, selectedId, gap, attention])
}
