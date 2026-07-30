// Tier-1 signal reporting. Fire-and-forget aggregate counts only:
// no cookies, no user ids, no PII. The endpoint (a Pages Function backed
// by D1) does a per-day UPSERT and sits behind Cloudflare rate limiting.
// Reads never touch D1 — the frontend only consumes static/edge-cached JSON.

export type Metric = 'view' | 'open' | 'favorite' | 'ics' | 'share'

const ENDPOINT = '/api/event'

function send(body: object) {
  try {
    const json = JSON.stringify(body)
    const ok = navigator.sendBeacon?.(ENDPOINT, new Blob([json], { type: 'application/json' }))
    if (!ok) {
      fetch(ENDPOINT, { method: 'POST', body: json, keepalive: true }).catch(() => {})
    }
  } catch {
    // never let telemetry break the app
  }
}

export function reportEvent(metric: Metric, confId: string) {
  send({ metric, conf: confId })
}

/** Queries that returned zero results — coverage backlog, not analytics. */
export function reportSearchMiss(query: string) {
  const q = query.trim().slice(0, 80)
  if (q) send({ metric: 'searchmiss', query: q })
}
