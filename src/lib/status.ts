import type { Status } from '../types'

const DAY = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Deadlines are dates; the actual cutoff moment is the end of that day
 * (23:59:59) in the entry's timezone. "AoE" (UTC-12) is the academic
 * default. Fixed offsets ("UTC", "UTC+8", "UTC-5:30") keep every runtime
 * — browser, edge function, build script — computing the same instant
 * without shipping a tz database; for DST zones contributors record the
 * offset in effect on the deadline date.
 */
function tzOffset(tz?: string): string {
  if (!tz || tz === 'AoE') return '-12:00'
  if (tz === 'UTC') return '+00:00'
  const m = /^UTC([+-])(\d{1,2})(?::(\d{2}))?$/.exec(tz)
  if (m) return `${m[1]}${m[2].padStart(2, '0')}:${m[3] ?? '00'}`
  return '-12:00' // unknown value → AoE, the conservative default
}

/**
 * A bare YYYY-MM deadline is an estimated month — used when an edition is
 * listed before its CFP publishes the real date (see data/schema.json).
 * Estimated deadlines render KDD-style as "~Jan '27" everywhere instead
 * of a fake day-precise date.
 */
export function isEstimatedDeadline(deadline: string): boolean {
  return deadline.length === 7
}

/** "2027-01" → "2027-01-31": last day of the month, for cutoff math. */
function endOfMonthDay(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${ym}-${new Date(Date.UTC(y, m, 0)).getUTCDate()}`
}

/**
 * Exact cutoff instant (ms since epoch). Deadlines are stored as full
 * local timestamps (YYYY-MM-DDTHH:MM:SS) interpreted in the entry's
 * timezone; a bare date (legacy) falls back to end of day, and an
 * estimated YYYY-MM to the end of that month.
 */
export function deadlineCutoffMs(deadline: string, tz?: string): number {
  const withDay = isEstimatedDeadline(deadline) ? endOfMonthDay(deadline) : deadline
  const stamp = withDay.includes('T') ? withDay : `${withDay}T23:59:59`
  return Date.parse(`${stamp}${tzOffset(tz)}`)
}

/** Date part of a deadline timestamp, for compact tile display. */
export function deadlineDate(deadline: string): string {
  return deadline.slice(0, 10)
}

/**
 * Whole days until the cutoff. Positive values are ceil'd ("due within
 * N days"); once the exact cutoff second passes the value goes negative
 * immediately — there is no ambiguous day-zero window.
 */
export function daysUntil(deadline: string, tz?: string, now = new Date()): number {
  const ms = deadlineCutoffMs(deadline, tz) - now.getTime()
  return ms >= 0 ? Math.ceil(ms / DAY) : Math.floor(ms / DAY)
}

/**
 * Status stays derived at render time. A passed deadline normally means
 * CLOSED, but when the venue has an officially announced next cycle whose
 * exact date isn't published yet (`nextCycleExpected`, YYYY-MM), the entry
 * is TBA — worth watching, not missed.
 */
export function statusOf(days: number, nextCycleExpected?: string): Status {
  if (days < 0) {
    if (nextCycleExpected && nextCycleExpected >= new Date().toISOString().slice(0, 7)) return 'TBA'
    return 'CLOSED'
  }
  if (days <= 21) return 'URGENT'
  if (days <= 90) return 'APPROACHING'
  return 'FAR'
}

export function formatCountdown(days: number): string {
  return `${days}d`
}

/** Human label for the entry's timezone, e.g. "AoE (UTC−12)". */
export function tzLabel(tz?: string): string {
  if (!tz || tz === 'AoE') return 'AoE (UTC−12)'
  return tz
}

/** Fine-grained remaining time for the detail panel, e.g. "57d 14h left". */
export function formatRemaining(msLeft: number): string {
  if (msLeft < 0) return 'closed'
  const d = Math.floor(msLeft / DAY)
  const h = Math.floor((msLeft % DAY) / 3_600_000)
  return d > 0 ? `${d}d ${h}h left` : `${h}h ${Math.floor((msLeft % 3_600_000) / 60_000)}m left`
}

/** The cutoff instant rendered in the viewer's local time. */
export function formatLocalCutoff(msCutoff: number): string {
  return new Date(msCutoff).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "2027-02" → "Feb '27" (short) or "Feb 2027" (long) */
export function formatExpectedMonth(ym: string, long = false): string {
  const [y, m] = ym.split('-')
  const month = MONTHS[Number(m) - 1] ?? m
  return long ? `${month} ${y}` : `${month} '${y.slice(-2)}`
}
