import type { Conference } from '../types'

// Client-side .ics generation — no backend involved.
export function downloadICS(conf: Conference) {
  const date = conf.deadline.replaceAll('-', '')
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//whatnext//conference-deadlines//EN',
    'BEGIN:VEVENT',
    `UID:${conf.id}-${conf.deadline}@whatnext`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${date}`,
    `SUMMARY:${conf.name} ${conf.year} submission deadline`,
    `DESCRIPTION:${conf.fullName} — paper deadline (${conf.tz ?? 'AoE'})${conf.website ? `\\n${conf.website}` : ''}`,
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
