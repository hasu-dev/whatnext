import type { Status } from '../types'

const DAY = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function daysUntil(deadline: string, now = new Date()): number {
  const d = new Date(deadline + 'T23:59:59')
  return Math.ceil((d.getTime() - now.getTime()) / DAY)
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

/** "2027-02" → "Feb '27" (short) or "Feb 2027" (long) */
export function formatExpectedMonth(ym: string, long = false): string {
  const [y, m] = ym.split('-')
  const month = MONTHS[Number(m) - 1] ?? m
  return long ? `${month} ${y}` : `${month} '${y.slice(-2)}`
}
