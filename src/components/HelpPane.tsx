import { TrendingUp, X } from 'lucide-react'

interface Props {
  onClose: () => void
}

const SHORTCUTS: Array<[string, string]> = [
  ['/', 'Focus the search box'],
  ['⌘K / Ctrl+K', 'Zen mode — hide everything but the map'],
  ['H', 'Toggle this help pane'],
  ['Esc', 'Close panels, deselect, exit zen'],
  ['Enter on a tile', 'Expand it in place'],
]

const SYNTAX: Array<[string, string]> = [
  ['neural', 'Fuzzy match on name, full name, field, and tags'],
  ['#llm', 'Exact tag match'],
  ['field:vision', 'Restrict to a field'],
  ['field:"health info"', 'Field values with spaces (quotes)'],
  ['-workshop or NOT x', 'Exclude'],
  ['a OR b', 'Either term (space means AND)'],
]

export function HelpPane({ onClose }: Props) {
  return (
    <div className="modal" onClick={onClose} role="dialog" aria-label="Help">
      <div className="modal__panel help" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <span>Help — shortcuts & search</span>
          <button onClick={onClose} aria-label="Close">
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>

        <div className="help__grid">
          <section>
            <h3 className="help__title">Keyboard</h3>
            {SHORTCUTS.map(([key, desc]) => (
              <div className="help__row" key={key}>
                <kbd>{key}</kbd>
                <span>{desc}</span>
              </div>
            ))}
          </section>

          <section>
            <h3 className="help__title">Search syntax</h3>
            {SYNTAX.map(([key, desc]) => (
              <div className="help__row" key={key}>
                <kbd>{key}</kbd>
                <span>{desc}</span>
              </div>
            ))}
          </section>
        </div>

        <div className="help__legend" aria-label="Tile status legend">
          <div className="help__key">
            <span className="help__swatch is-urgent" />
            Urgent
          </div>
          <div className="help__key">
            <span className="help__swatch is-approaching" />
            Approaching
          </div>
          <div className="help__key">
            <span className="help__swatch is-far" />
            Far
          </div>
          <div className="help__key">
            <span className="help__swatch is-closed" />
            <s>Closed</s>
          </div>
          <div className="help__key">
            <span className="help__tag">(TBA)</span>
            Next cycle date pending
          </div>
          <div className="help__key">
            <TrendingUp size={13} strokeWidth={2} />
            Trending in its field
          </div>
        </div>

        <p className="help__foot">
          Tile area reflects attention. Click the timeline ranges to filter by horizon. Data is
          community-maintained — use Report / Add conf to contribute via GitHub.
        </p>
      </div>
    </div>
  )
}
