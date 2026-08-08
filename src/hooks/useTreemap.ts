import { useMemo } from 'react'
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import type { Attention, Conference, TileRect } from '../types'
import { daysUntil, statusOf } from '../lib/status'
import {
  DETAIL_FRESHNESS_NEED,
  detailCoreNeed,
  detailFullNameNeed,
  detailTagsNeed,
} from '../lib/detailBudget'

interface Args {
  conferences: Conference[]
  width: number
  height: number
  selectedId: string | null
  gap: number
  attention: Attention | null
  /**
   * Enables the flagship/cluster split. Off while any filter is active:
   * filtered results are things the user is looking for, so every match
   * renders as a proportional, information-bearing tile.
   */
  clustered: boolean
}

// A conference with this much decayed signal fully trusts behavior over
// the editorial weight prior. Signals are already log-compressed upstream.
const SATURATION = 20

// Beyond this many visible conferences, only the highest-value flagships
// keep proportional tiles; everything else merges into clusters rendered
// as grids of equal small squares — status colors intact, hover for a
// peek card, click to select and expand.
const FLAGSHIP_COUNT = 20

/**
 * Stock-market-style sizing: tile area is significance × urgency.
 * Significance is the weight/attention blend; urgency scales it so a
 * looming deadline dominates while closed/TBA entries recede.
 */
function urgencyFactor(conf: Conference): number {
  const days = daysUntil(conf.deadline, conf.tz)
  const status = statusOf(days, conf.nextCycleExpected)
  if (status === 'CLOSED') return 0.35
  if (status === 'TBA') return 0.55
  if (days <= 7) return 1.9
  if (days <= 21) return 1.6
  if (days <= 60) return 1.25
  if (days <= 120) return 1.0
  return 0.75
}

function areaValue(conf: Conference, attention: Attention | null, maxDecayed: number, maxWeight: number): number {
  const att = attention?.conferences[conf.id]
  let significance = conf.weight
  if (att && maxDecayed > 0) {
    const alpha = Math.min(1, att.decayed / SATURATION)
    const behavioral = (att.decayed / maxDecayed) * maxWeight * 1.4
    significance = (1 - alpha) * conf.weight + alpha * behavioral
  }
  return significance * urgencyFactor(conf)
}

function computeValues(conferences: Conference[], attention: Attention | null): Map<string, number> {
  const maxWeight = Math.max(...conferences.map((c) => c.weight))
  const maxDecayed = Math.max(0, ...conferences.map((c) => attention?.conferences[c.id]?.decayed ?? 0))
  return new Map(conferences.map((c) => [c.id, areaValue(c, attention, maxDecayed, maxWeight)]))
}

/** Same significance × urgency ordering the map uses — for the mobile feed. */
export function rankByValue(conferences: Conference[], attention: Attention | null): Conference[] {
  if (conferences.length === 0) return []
  const values = computeValues(conferences, attention)
  return [...conferences].sort((a, b) => (values.get(b.id) ?? 0) - (values.get(a.id) ?? 0))
}

/**
 * Two-column treemap for phones: a scrollable masonry where tile HEIGHT
 * carries the significance × urgency signal (a 1-D slice layout per
 * column, balanced greedily). The selected tile breaks out to span both
 * columns at its position so the detail panel has room.
 */
export function mobileColumnLayout(
  conferences: Conference[],
  attention: Attention | null,
  width: number,
  selectedId: string | null,
  gap: number,
): { tiles: TileRect[]; height: number } {
  if (!width || conferences.length === 0) return { tiles: [], height: 0 }
  const ranked = rankByValue(conferences, attention)
  const values = computeValues(conferences, attention)
  const maxV = Math.max(...values.values())
  const colW = (width - gap) / 2
  const colY = [0, 0]
  const tiles: TileRect[] = []

  for (const conf of ranked) {
    if (conf.id === selectedId) {
      // full-width breakout, sized to fit the detail content
      const y = Math.max(colY[0], colY[1])
      const h = Math.min(estimateDetailHeight(conf), 620)
      tiles.push({ x: 0, y, w: width, h, conf })
      colY[0] = colY[1] = y + h + gap
      continue
    }
    const v = (values.get(conf.id) ?? 0) / maxV
    const h = Math.round(88 + v * 210)
    const col = colY[0] <= colY[1] ? 0 : 1
    tiles.push({ x: col * (colW + gap), y: colY[col], w: colW, h, conf })
    colY[col] += h + gap
  }
  return { tiles, height: Math.max(colY[0], colY[1]) }
}

/**
 * Rough pixel height the expanded detail needs for THIS conference —
 * header + name + every detail row it will actually render, using the
 * same row constants Tile.tsx gates its progressive disclosure on
 * (lib/detailBudget). The boost loop steers the selected tile's height
 * toward this, so the card tends to fit its content: not clipped, not
 * cavernous.
 */
export function estimateDetailHeight(conf: Conference): number {
  let px = 24 /* padding */ + 26 /* header row */ + 66 /* name */ + 8
  px += detailFullNameNeed(conf.fullName.length)
  px += detailCoreNeed(conf)
  px += detailTagsNeed(conf.tags?.length ?? 0)
  px += DETAIL_FRESHNESS_NEED
  return Math.round(px * 1.08) // small safety margin
}

export function useTreemap({ conferences, width, height, selectedId, gap, attention, clustered }: Args): TileRect[] {
  return useMemo(() => {
    if (!width || !height || conferences.length === 0) return []

    const values = computeValues(conferences, attention)
    const maxValue = Math.max(...values.values())

    // Beyond the flagship count, the long tail is first MERGED: tail
    // venues cluster by field into a handful of larger blocks, each
    // sized by member count. The clusters then fit into the treemap
    // alongside the flagships like any other tile, and their interiors
    // render as gapless grids of equal member squares.
    let head = conferences
    const clusters: Conference[][] = []
    let uniform = 0
    if (clustered && conferences.length > FLAGSHIP_COUNT) {
      const ranked = [...conferences].sort((a, b) => (values.get(b.id) ?? 0) - (values.get(a.id) ?? 0))
      head = ranked.slice(0, FLAGSHIP_COUNT)
      let tail = ranked.slice(FLAGSHIP_COUNT)
      // a selected tail venue is promoted so it can expand in place
      if (selectedId && tail.some((c) => c.id === selectedId)) {
        tail = tail.filter((c) => c.id !== selectedId)
        head = [...head, conferences.find((c) => c.id === selectedId)!]
      }

      const headSum = head.reduce((a, c) => a + (values.get(c.id) ?? 0), 0)
      const mapArea = width * height
      // per-member footprint: ~30px squares, shrinking if the tail would
      // crowd the map beyond ~30%
      const cellArea = Math.min(900, (mapArea * 0.3) / tail.length)
      const denom = Math.max(mapArea * 0.15, mapArea - cellArea * tail.length)
      uniform = (cellArea * headSum) / denom

      // equal-size chunks (not per-field): every cluster block lands in
      // the map at a similar, substantial size instead of small fields
      // shattering into slivers of stray squares
      const clusterCount = Math.max(1, Math.ceil(tail.length / 30))
      const clusterSize = Math.ceil(tail.length / clusterCount)
      for (let i = 0; i < tail.length; i += clusterSize) {
        const members = tail.slice(i, i + clusterSize)
        // urgent members sort to the block's top-left corner
        clusters.push(members.sort((a, b) => daysUntil(a.deadline, a.tz) - daysUntil(b.deadline, b.tz)))
      }
    }

    type Node = { children?: Node[]; conf?: Conference; cluster?: Conference[] }
    // interleave flagships and clusters so big blocks and square-grids
    // alternate through the layout instead of segregating into regions
    const headNodes: Node[] = head.map((conf) => ({ conf }))
    const clusterNodes: Node[] = clusters.map((cluster) => ({ cluster }))
    const children: Node[] = []
    for (let i = 0; i < Math.max(headNodes.length, clusterNodes.length); i++) {
      if (headNodes[i]) children.push(headNodes[i])
      if (clusterNodes[i]) children.push(clusterNodes[i])
    }
    const rootData: Node = { children }

    const layout = (selectedValue: number | null) => {
      const root = hierarchy<Node>(rootData).sum((d) => {
        if (d.cluster) return uniform * d.cluster.length
        if (!d.conf) return 0
        if (d.conf.id === selectedId && selectedValue !== null) return selectedValue
        return values.get(d.conf.id) ?? d.conf.weight
      })
      treemap<Node>()
        .tile(treemapSquarify.ratio(1.35))
        .size([width, height])
        .paddingInner(gap)
        .round(true)(root)
      return root.leaves() as unknown as Array<{
        x0: number
        y0: number
        x1: number
        y1: number
        data: Node
      }>
    }

    let leaves
    if (!selectedId || !values.has(selectedId)) {
      leaves = layout(null)
    } else {
      // steer the selected tile toward its content size: the detail panel
      // needs width as well as height. Bounded by a focus floor and half
      // the map's area.
      const selConf = conferences.find((c) => c.id === selectedId)!
      const base = values.get(selectedId)!
      const total = [...values.values()].reduce((a, b) => a + b, 0)
      const floor = Math.max(base * 2, maxValue * 1.15)
      // phone-sized maps let the selection take up to ~75% of the area —
      // the desktop 50% cap can never fit the detail panel there
      const smallMap = width < 480
      const cap = Math.max(floor, (total - base) * (smallMap ? 3 : 1))
      const targetH = Math.min(height * 0.85, estimateDetailHeight(selConf))
      const targetW = Math.min(width * (smallMap ? 0.92 : 0.8), 320)

      let boost = Math.min(Math.max(base * 4, maxValue * 1.3), cap)
      leaves = layout(boost)
      for (let i = 0; i < 7; i++) {
        const sel = leaves.find((l) => l.data.conf?.id === selectedId)
        if (!sel) break
        const selH = sel.y1 - sel.y0
        const selW = sel.x1 - sel.x0
        if ((selH < targetH || selW < targetW) && boost < cap) {
          boost = Math.min(boost * 1.45, cap)
        } else if (selH > targetH * 1.35 && selW > targetW * 1.3 && boost > floor * 1.02) {
          boost = Math.max(boost * 0.7, floor)
        } else {
          break
        }
        leaves = layout(boost)
      }
    }

    // expand leaves: flagship tiles directly; cluster blocks unfold into a
    // gapless interior grid of equal member squares. Archive tiles carry
    // their own hairline borders, so the interior gap can be 0 there; mono
    // keeps its 1px grid lines.
    const interiorGap = Math.min(gap, 1)
    const tiles: TileRect[] = []
    for (const leaf of leaves) {
      const x = leaf.x0
      const y = leaf.y0
      const w = leaf.x1 - leaf.x0
      const h = leaf.y1 - leaf.y0
      if (leaf.data.conf) {
        tiles.push({ x, y, w, h, conf: leaf.data.conf })
        continue
      }
      const members = leaf.data.cluster
      if (!members || members.length === 0 || w <= 0 || h <= 0) continue
      const n = members.length
      const cols = Math.max(1, Math.round(Math.sqrt((n * w) / Math.max(1, h))))
      const rows = Math.ceil(n / cols)
      const cellH = (h - (rows - 1) * interiorGap) / rows
      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / cols)
        const col = i % cols
        // the last row stretches its cells so the block stays fully filled
        const inLastRow = row === rows - 1
        const rowCount = inLastRow ? n - cols * (rows - 1) : cols
        const cellW = (w - (rowCount - 1) * interiorGap) / rowCount
        tiles.push({
          x: x + col * (cellW + interiorGap),
          y: y + row * (cellH + interiorGap),
          w: cellW,
          h: cellH,
          conf: members[i],
        })
      }
    }
    return tiles
  }, [conferences, width, height, selectedId, gap, attention, clustered])
}
