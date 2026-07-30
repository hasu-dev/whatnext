import { useEffect, useState } from 'react'
import type { Attention } from '../types'

// Aggregated attention data, produced by the cron worker and served as
// edge-cached JSON. Strictly progressive enhancement: first paint never
// waits for it, and its absence (local dev, cold deploy) is normal.
export function useAttention(): Attention | null {
  const [attention, setAttention] = useState<Attention | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/attention.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Attention | null) => {
        if (!cancelled && data && data.conferences && Object.keys(data.conferences).length > 0) {
          setAttention(data)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return attention
}
