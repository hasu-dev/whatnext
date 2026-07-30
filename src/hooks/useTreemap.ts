import { useMemo } from 'react'
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import type { Conference, TileRect } from '../types'

interface Args {
  conferences: Conference[]
  width: number
  height: number
  selectedId: string | null
  gap: number
}

/**
 * Computes treemap rectangles with d3. The selected conference gets its
 * layout weight boosted so it expands in place; framer-motion animates
 * every tile toward its new rect.
 */
export function useTreemap({ conferences, width, height, selectedId, gap }: Args): TileRect[] {
  return useMemo(() => {
    if (!width || !height || conferences.length === 0) return []

    // selection boost: ×4, but never less than 1.3× the heaviest conference,
    // so even a low-weight venue expands into the largest tile with room
    // for its detail block
    const maxWeight = Math.max(...conferences.map((c) => c.weight))
    const root = hierarchy<{ children: Conference[] } | Conference>({ children: conferences })
      .sum((d) => {
        const conf = d as Conference
        if (!conf.weight) return 0
        return conf.id === selectedId ? Math.max(conf.weight * 4, maxWeight * 1.3) : conf.weight
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
  }, [conferences, width, height, selectedId, gap])
}
