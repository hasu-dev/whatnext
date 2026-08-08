import { forwardRef, useEffect } from 'react'
import { Moon, Search, Sun } from 'lucide-react'
import { usePersistedValue } from '../hooks/usePersistedValue'
import { syncMetaThemeColor } from '../lib/theme'

export type ThemeName = 'archive' | 'mono'

interface Props {
  query: string
  onQuery: (q: string) => void
  theme: ThemeName
  onTheme: (t: ThemeName) => void
}

export const TopBar = forwardRef<HTMLInputElement, Props>(function TopBar(
  { query, onQuery, theme, onTheme },
  inputRef,
) {
  // mode lives here, not in App: its only consumers are this button and
  // the <html> attribute, so toggling never re-renders the tile tree.
  // First visit follows the OS scheme; the pre-paint script in index.html
  // applies the same value before React mounts.
  const [mode, setMode] = usePersistedValue<'dark' | 'light'>('mode', (stored) =>
    stored === 'dark' || stored === 'light'
      ? stored
      : matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light',
  )
  useEffect(() => {
    document.documentElement.dataset.mode = mode
    syncMetaThemeColor()
  }, [mode])
  const dark = mode === 'dark'

  return (
    <header className="topbar">
      <div className="topbar__brand">
        WHATNEXT{' '}
        <em>
          by{' '}
          <a href="https://hasu.ai" target="_blank" rel="noopener noreferrer">
            hasu.ai
          </a>
        </em>
      </div>

      <label className="search">
        <Search size={13} strokeWidth={1.75} aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Filter conferences (field / keyword)"
          aria-label="Filter conferences"
        />
        <kbd>/</kbd>
      </label>

      <div className="topbar__right">
        <span className="topbar__hint">⌘K zen · H help</span>
        <div className="theme-toggle" role="group" aria-label="Theme">
          <button
            className={theme === 'archive' ? 'is-active' : ''}
            onClick={() => onTheme('archive')}
          >
            Archive
          </button>
          <button
            className={theme === 'mono' ? 'is-active' : ''}
            onClick={() => onTheme('mono')}
          >
            Mono
          </button>
        </div>
        <button
          className="mode-toggle"
          onClick={() => setMode(dark ? 'light' : 'dark')}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={dark}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun size={13} strokeWidth={1.75} /> : <Moon size={13} strokeWidth={1.75} />}
        </button>
      </div>
    </header>
  )
})
