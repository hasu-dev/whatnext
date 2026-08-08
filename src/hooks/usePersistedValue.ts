import { useState } from 'react'

/**
 * localStorage-backed scalar state (theme, dark/light mode). Reads and
 * writes are guarded: blocked-storage browsers degrade to in-memory state
 * instead of throwing mid-render — there is no error boundary above the
 * app. `fromStored` maps the raw stored string (or null) to a valid value,
 * so junk left in storage can never leak into the DOM.
 */
export function usePersistedValue<T extends string>(
  key: string,
  fromStored: (stored: string | null) => T,
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(key)
    } catch {
      /* storage blocked — fall through with null */
    }
    return fromStored(stored)
  })
  const set = (v: T) => {
    setValue(v)
    try {
      localStorage.setItem(key, v)
    } catch {
      /* storage blocked — keep the in-memory value */
    }
  }
  return [value, set]
}
