import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Star } from 'lucide-react'
import { TopBar, type ThemeName } from './components/TopBar'
import { Tile } from './components/Tile'
import { Timeline } from './components/Timeline'
import { AddConference } from './components/AddConference'
import { HelpPane } from './components/HelpPane'
import { useTreemap } from './hooks/useTreemap'
import { useAttention } from './hooks/useAttention'
import { loadConferences } from './data/loader'
import { daysUntil, deadlineDate, formatCountdown, statusOf } from './lib/status'
import type { TileRect } from './types'
import { matchesQuery, parseQuery } from './lib/search'
import { reportEvent, reportSearchMiss } from './lib/events'

const CONFERENCES = loadConferences()
const FIELDS = [...new Set(CONFERENCES.map((c) => c.field))].sort()

function usePersistedSet(key: string, validValues: string[]): [Set<string>, (id: string) => void] {
  const [set, setSet] = useState<Set<string>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? '[]') as string[]
      const valid = new Set(validValues)
      const next = new Set<string>()
      for (const v of raw) {
        if (valid.has(v)) {
          next.add(v)
        } else {
          // legacy conference ids predate the -year suffix; migrate them
          // when they map unambiguously onto a current entry, otherwise
          // drop them so counts never disagree with the dataset
          const matches = validValues.filter((x) => x.startsWith(`${v}-`))
          if (matches.length === 1) next.add(matches[0])
        }
      }
      if (next.size !== raw.length || raw.some((v) => !next.has(v))) {
        localStorage.setItem(key, JSON.stringify([...next]))
      }
      return next
    } catch {
      return new Set()
    }
  })
  const toggle = (id: string) => {
    setSet((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem(key, JSON.stringify([...next]))
      return next
    })
  }
  return [set, toggle]
}

export default function App() {
  const [theme, setTheme] = useState<ThemeName>(
    () => (localStorage.getItem('theme') as ThemeName) ?? 'archive',
  )
  const [query, setQuery] = useState('')
  const [activeFields, toggleField] = usePersistedSet('fields', FIELDS)
  const [favorites, toggleFave] = usePersistedSet(
    'favorites',
    CONFERENCES.map((c) => c.id),
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [horizon, setHorizon] = useState<number | null>(null)
  const [zen, setZen] = useState(false)
  const [favesOnly, setFavesOnly] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [peek, setPeek] = useState<TileRect | null>(null)
  const attention = useAttention()

  const searchRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const el = mapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        // zen mode: nothing but the map
        e.preventDefault()
        setZen((z) => !z)
      } else if (
        e.key.toLowerCase() === 'h' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        // plain H — not ⌘H (macOS hide-window), and on a different
        // physical key than "/" so it can't be mistyped as search
        e.preventDefault()
        setHelpOpen((v) => !v)
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        setZen(false)
        searchRef.current?.focus()
      } else if (e.key === 'Escape') {
        setHelpOpen(false)
        setZen(false)
        setSelectedId(null)
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const visible = useMemo(() => {
    const parsed = parseQuery(query)
    return CONFERENCES.filter((c) => {
      if (favesOnly && !favorites.has(c.id)) return false
      if (activeFields.size > 0 && !activeFields.has(c.field)) return false
      if (horizon !== null) {
        const days = daysUntil(c.deadline, c.tz)
        if (days < 0 || days > horizon) return false
      }
      return matchesQuery(c, parsed)
    })
  }, [query, activeFields, horizon, favesOnly, favorites])

  // report queries that found nothing (incl. tag misses) as coverage
  // backlog — debounced, deduped per session, no other context attached
  const missReported = useRef(new Set<string>())
  useEffect(() => {
    if (!query.trim() || visible.length > 0) return
    const q = query.trim().toLowerCase()
    if (missReported.current.has(q)) return
    const t = setTimeout(() => {
      missReported.current.add(q)
      reportSearchMiss(q)
    }, 1200)
    return () => clearTimeout(t)
  }, [query, visible.length])

  // trending = velocity normalized within the conference's field, so small
  // venues can surface; never driven by absolute counts
  const trendingIds = useMemo(() => {
    if (!attention) return new Set<string>()
    const byField = new Map<string, number[]>()
    for (const c of CONFERENCES) {
      const v = attention.conferences[c.id]?.velocity
      if (v !== undefined) byField.set(c.field, [...(byField.get(c.field) ?? []), v])
    }
    const ids = new Set<string>()
    for (const c of CONFERENCES) {
      const v = attention.conferences[c.id]?.velocity
      if (v === undefined) continue
      const peers = byField.get(c.field) ?? []
      const fieldMedian = peers.slice().sort((a, b) => a - b)[Math.floor(peers.length / 2)] || 1
      if (v >= 1.5 && v >= fieldMedian * 1.3) ids.add(c.id)
    }
    return ids
  }, [attention])

  const rects = useTreemap({
    conferences: visible,
    width: size.w,
    height: size.h,
    selectedId,
    // mono draws dividers via a 1px gap over the black map background;
    // 0 would stack adjacent tile borders into uneven 2px lines
    gap: theme === 'archive' ? 6 : 1,
    attention,
    // any active filter means the user is searching — every match gets a
    // proportional, readable tile instead of anonymous cluster squares
    clustered: !query.trim() && activeFields.size === 0 && !favesOnly && horizon === null,
  })

  const select = (id: string) => {
    const next = selectedId === id ? null : id
    setSelectedId(next)
    setPeek(null)
    if (next) reportEvent('open', next)
  }

  return (
    <div className={`app ${zen ? 'is-zen' : ''}`}>
      {!zen && (
        <TopBar
          ref={searchRef}
          query={query}
          onQuery={setQuery}
          theme={theme}
          onTheme={setTheme}
        />
      )}

      {!zen && (
        <div className="filters">
          <span className="filters__label">Fields /</span>
          {FIELDS.map((f) => (
            <button
              key={f}
              className={`chip ${activeFields.has(f) ? 'is-active' : ''}`}
              onClick={() => toggleField(f)}
            >
              {f}
            </button>
          ))}
          <button
            className={`chip chip--starred ${favesOnly ? 'is-active' : ''}`}
            onClick={() => setFavesOnly((v) => !v)}
            aria-pressed={favesOnly}
          >
            <Star size={10} strokeWidth={1.75} fill={favesOnly ? 'currentColor' : 'none'} />
            Starred{favorites.size > 0 ? ` (${favorites.size})` : ''}
          </button>
          <button className="chip chip--add" onClick={() => setAddOpen(true)}>
            <Plus size={10} strokeWidth={2} />
            Add conf
          </button>
        </div>
      )}

      <main className="treemap" ref={mapRef}>
        {rects.length === 0 && (
          <div className="treemap__empty">
            {favesOnly ? 'NO STARRED CONFERENCES YET — CLICK A ☆ ON A TILE' : 'NO CONFERENCES MATCH'}
          </div>
        )}
        {rects.map((r) => (
          <Tile
            key={r.conf.id}
            rect={r}
            selected={selectedId === r.conf.id}
            faved={favorites.has(r.conf.id)}
            trending={trendingIds.has(r.conf.id)}
            onSelect={() => select(r.conf.id)}
            onFave={() => {
              if (!favorites.has(r.conf.id)) reportEvent('favorite', r.conf.id)
              toggleFave(r.conf.id)
            }}
            onTagClick={(tag) => setQuery(`#${tag}`)}
            onPeek={setPeek}
          />
        ))}
        {peek &&
          (() => {
            const days = daysUntil(peek.conf.deadline, peek.conf.tz)
            const status = statusOf(days, peek.conf.nextCycleExpected)
            const cardW = 200
            const cardH = 92
            const left = Math.max(4, Math.min(peek.x + peek.w / 2 - cardW / 2, size.w - cardW - 4))
            const top = peek.y - cardH - 8 >= 0 ? peek.y - cardH - 8 : peek.y + peek.h + 8
            return (
              <div className="peek" style={{ left, top, width: cardW }}>
                <div className="peek__head">
                  <span className="peek__name">
                    {peek.conf.name}
                    <sup>({String(peek.conf.year).slice(-2)})</sup>
                  </span>
                  <span className="peek__status">({status})</span>
                </div>
                <div className="peek__meta">
                  <span>
                    {peek.conf.field} · {deadlineDate(peek.conf.deadline)}
                  </span>
                  <span>
                    {status === 'CLOSED' ? 'closed' : formatCountdown(days)} · click to expand
                  </span>
                </div>
              </div>
            )
          })()}
      </main>

      {!zen && <Timeline conferences={visible} horizon={horizon} onHorizon={setHorizon} />}

      {addOpen && <AddConference fields={FIELDS} onClose={() => setAddOpen(false)} />}
      {helpOpen && <HelpPane onClose={() => setHelpOpen(false)} />}
    </div>
  )
}
