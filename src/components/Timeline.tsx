import type { Conference } from '../types'
import { daysUntil } from '../lib/status'

// log-ish scale: NOW / WEEK / MONTH / QUARTER / YEAR anchor points.
// Every anchor is also a filter: clicking WEEK keeps only conferences whose
// deadline falls within the next 7 days, and so on. NOW clears the filter.
// Between anchors, the track shows how many deadlines land in that interval.
const ANCHORS = [
  { label: 'Now', days: null as number | null, pos: 0 },
  { label: 'Week', days: 7, pos: 0.18 },
  { label: 'Month', days: 30, pos: 0.42 },
  { label: 'Quarter', days: 90, pos: 0.7 },
  { label: 'Year', days: 365, pos: 1 },
]

function labelTransform(pos: number): string {
  if (pos === 0) return 'none'
  if (pos === 1) return 'translateX(-100%)'
  return 'translateX(-50%)'
}

interface Props {
  conferences: Conference[]
  horizon: number | null
  onHorizon: (days: number | null) => void
}

export function Timeline({ conferences, horizon, onHorizon }: Props) {
  const allDays = conferences.map((c) => daysUntil(c.deadline, c.tz))
  const segments = ANCHORS.slice(1).map((b, i) => {
    const a = ANCHORS[i]
    const lo = a.days ?? 0
    const count = allDays.filter((d) => d >= (i === 0 ? 0 : lo + 1) && d <= (b.days as number)).length
    return { key: `${a.label}-${b.label}`, pos: (a.pos + b.pos) / 2, count }
  })

  return (
    <footer className="timeline" aria-label="Deadline timeline">
      <div className="timeline__track">
        <div className="timeline__axis" />
        {ANCHORS.map((a) => (
          <span key={a.label}>
            <button
              className={`timeline__label ${horizon === a.days && a.days !== null ? 'is-active' : ''}`}
              style={{ left: `${a.pos * 100}%`, transform: labelTransform(a.pos) }}
              onClick={() => onHorizon(horizon === a.days ? null : a.days)}
              aria-pressed={horizon === a.days && a.days !== null}
            >
              {a.label}
              {a.days !== null && horizon === a.days ? ' ×' : ''}
            </button>
            <span className="timeline__tick" style={{ left: `${a.pos * 100}%` }} />
          </span>
        ))}
        {segments.map(
          (s) =>
            s.count > 0 && (
              <span
                key={s.key}
                className="timeline__count"
                style={{ left: `${s.pos * 100}%` }}
                title={`${s.count} deadline${s.count > 1 ? 's' : ''} in this range`}
              >
                {s.count}
              </span>
            ),
        )}
      </div>
    </footer>
  )
}
