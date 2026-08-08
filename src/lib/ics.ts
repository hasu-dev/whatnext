import type { Conference } from '../types'
import {
  daysUntil,
  deadlineCutoffMs,
  deadlineDate,
  formatExpectedMonth,
  isEstimatedDeadline,
  statusOf,
} from './status'

const compactUtc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'

// Client-side .ics generation — no backend involved. The event carries
// the exact cutoff instant (converted to UTC), not just the date.
export function downloadICS(conf: Conference) {
  const cutoff = deadlineCutoffMs(conf.deadline, conf.tz)
  const stamp = compactUtc(Date.now())
  // neither a passed deadline nor a projected one may read as a live,
  // confirmed date in the user's calendar
  const status = statusOf(daysUntil(conf.deadline, conf.tz), conf.nextCycleExpected)
  const estimated = isEstimatedDeadline(conf.deadline)
  const qualifier = estimated
    ? ' (estimated)'
    : status === 'TBA'
      ? ' (last cycle — next TBA)'
      : status === 'CLOSED'
        ? ' (closed)'
        : ''
  const extraNote =
    status === 'TBA' && conf.nextCycleExpected
      ? `\\nNext cycle expected ${formatExpectedMonth(conf.nextCycleExpected, true)} — date TBA`
      : estimated
        ? '\\nEstimated month — exact date not yet announced'
        : ''
  const cutoffLabel = estimated
    ? `expected ~${formatExpectedMonth(conf.deadline, true)}`
    : `${conf.deadline.replace('T', ' ')} (${conf.tz ?? 'AoE'})`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//whatnext//conference-deadlines//EN',
    'BEGIN:VEVENT',
    `UID:${conf.id}-${deadlineDate(conf.deadline)}@whatnext`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${compactUtc(cutoff)}`,
    `SUMMARY:${conf.name} ${conf.year} submission deadline${qualifier}`,
    `DESCRIPTION:${conf.fullName} — paper cutoff ${cutoffLabel}${extraNote}${conf.website ? `\\n${conf.website}` : ''}`,
    ...(conf.website ? [`URL:${conf.website}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-P7D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${conf.name} deadline in 7 days`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${conf.id}-deadline.ics`
  a.click()
  URL.revokeObjectURL(url)
}
