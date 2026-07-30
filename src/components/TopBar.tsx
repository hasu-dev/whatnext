import { forwardRef } from 'react'
import { Search } from 'lucide-react'

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
      </div>
    </header>
  )
})
