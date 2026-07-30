import type { Conference } from '../types'
import { deadlineCutoffMs, deadlineDate } from './status'

const compactUtc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'

// Client-side .ics generation — no backend involved. The event carries
// the exact cutoff instant (converted to UTC), not just the date.
export function downloadICS(conf: Conference) {
  const cutoff = deadlineCutoffMs(conf.deadline, conf.tz)
  const stamp = compactUtc(Date.now())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//whatnext//conference-deadlines//EN',
    'BEGIN:VEVENT',
    `UID:${conf.id}-${deadlineDate(conf.deadline)}@whatnext`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${compactUtc(cutoff)}`,
    `SUMMARY:${conf.name} ${conf.year} submission deadline`,
    `DESCRIPTION:${conf.fullName} — paper cutoff ${conf.deadline.replace('T', ' ')} (${conf.tz ?? 'AoE'})${conf.website ? `\\n${conf.website}` : ''}`,
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
