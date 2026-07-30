import type { Status } from '../types'

const DAY = 86_400_000

export function daysUntil(deadline: string, now = new Date()): number {
  const d = new Date(deadline + 'T23:59:59')
  return Math.ceil((d.getTime() - now.getTime()) / DAY)
}

export function statusOf(days: number): Status {
  if (days < 0) return 'CLOSED'
  if (days <= 21) return 'URGENT'
  if (days <= 90) return 'APPROACHING'
  return 'FAR'
}

export function formatCountdown(days: number): string {
  return `${days}d`
}
