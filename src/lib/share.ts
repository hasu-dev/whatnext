import type { Conference } from '../types'
import { daysUntil, deadlineDate, formatExpectedMonth, isEstimatedDeadline, statusOf } from './status'
import { reportEvent } from './events'

/**
 * Share a conference. On touch devices with the Web Share API this opens
 * the native iOS/Android share sheet; elsewhere it copies the share URL.
 * Must be called directly from a user gesture (navigator.share requires
 * it), so keep it first in the click handler — no awaits before it.
 */
export async function shareConference(conf: Conference): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = `${location.origin}/s/${conf.id}`
  const nativeCapable = typeof navigator.share === 'function' && matchMedia('(pointer: coarse)').matches

  // the shared text must not present a passed deadline as live
  const status = statusOf(daysUntil(conf.deadline, conf.tz), conf.nextCycleExpected)
  const text =
    status === 'TBA' && conf.nextCycleExpected
      ? `${conf.fullName} — next cycle expected ${formatExpectedMonth(conf.nextCycleExpected, true)}, date TBA`
      : isEstimatedDeadline(conf.deadline)
        ? `${conf.fullName} — deadline expected ~${formatExpectedMonth(conf.deadline, true)} (estimated)`
        : `${conf.fullName} — deadline ${deadlineDate(conf.deadline)}${status === 'CLOSED' ? ' (closed)' : ''}`

  if (nativeCapable) {
    try {
      await navigator.share({
        title: `${conf.name} ${conf.year}`,
        text,
        url,
      })
      reportEvent('share', conf.id)
      return 'shared'
    } catch {
      // user dismissed the sheet (AbortError) — not a share
      return 'cancelled'
    }
  }

  try {
    await navigator.clipboard?.writeText(url)
  } catch {
    /* clipboard unavailable — the /s/ URL is still visible in the sheet-less fallback */
  }
  reportEvent('share', conf.id)
  return 'copied'
}
