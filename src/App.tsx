import { useEffect, useMemo, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import { TopBar, type ThemeName } from './components/TopBar'
import { Tile } from './components/Tile'
import { Timeline } from './components/Timeline'
import { useTreemap } from './hooks/useTreemap'
import { loadConferences } from './data/loader'
import { daysUntil } from './lib/status'

const CONFERENCES = loadConferences()
const FIELDS = [...new Set(CONFERENCES.map((c) => c.field))].sort()

function usePersistedSet(key: string): [Set<string>, (id: string) => void] {
  const [set, setSet] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as string[])
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
  const [activeFields, toggleField] = usePersistedSet('fields')
  const [favorites, toggleFave] = usePersistedSet('favorites')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [horizon, setHorizon] = useState<number | null>(null)
  const [zen, setZen] = useState(false)
  const [favesOnly, setFavesOnly] = useState(false)

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
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        setZen(false)
        searchRef.current?.focus()
      } else if (e.key === 'Escape') {
        setZen(false)
        setSelectedId(null)
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CONFERENCES.filter((c) => {
      if (favesOnly && !favorites.has(c.id)) return false
      if (activeFields.size > 0 && !activeFields.has(c.field)) return false
      if (horizon !== null) {
        const days = daysUntil(c.deadline)
        if (days < 0 || days > horizon) return false
      }
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.fullName.toLowerCase().includes(q) ||
        c.field.toLowerCase().includes(q)
      )
    })
  }, [query, activeFields, horizon, favesOnly, favorites])

  const rects = useTreemap({
    conferences: visible,
    width: size.w,
    height: size.h,
    selectedId,
    // mono draws dividers via a 1px gap over the black map background;
    // 0 would stack adjacent tile borders into uneven 2px lines
    gap: theme === 'archive' ? 6 : 1,
  })

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
          <span className="filters__label">FIELDS /</span>
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
            STARRED{favorites.size > 0 ? ` (${favorites.size})` : ''}
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
            onSelect={() => setSelectedId(selectedId === r.conf.id ? null : r.conf.id)}
            onFave={() => toggleFave(r.conf.id)}
          />
        ))}
      </main>

      {!zen && <Timeline conferences={visible} horizon={horizon} onHorizon={setHorizon} />}
    </div>
  )
}
