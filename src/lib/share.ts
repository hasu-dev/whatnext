import type { Conference } from '../types'
import { deadlineDate } from './status'
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

  if (nativeCapable) {
    try {
      await navigator.share({
        title: `${conf.name} ${conf.year}`,
        text: `${conf.fullName} — deadline ${deadlineDate(conf.deadline)}`,
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
