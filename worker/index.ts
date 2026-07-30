// Aggregation worker. The cron reads the last 28 days of counts from D1,
// computes decayed attention + velocity in JS (no SQLite math functions),
// and writes the snapshot to KV, where the Pages Function serves it as
// edge-cached /attention.json. The frontend never queries D1.
export interface Env {
  DB: D1Database
  CACHE: KVNamespace
  // set via `wrangler secret put ADMIN_TOKEN`; the fetch endpoints refuse
  // all requests until it exists
  ADMIN_TOKEN?: string
}

// intent-ordered weights: the stronger the intent, the higher the weight
const WEIGHTS: Record<string, number> = {
  ics: 5,
  share: 4,
  favorite: 3,
  open: 2,
  view: 1,
}

const HALF_LIFE_DAYS = 7
const WINDOW_DAYS = 28

interface CountRow {
  conf_id: string
  day: string
  metric: string
  n: number
}

export function aggregate(rows: CountRow[], today: string) {
  const todayMs = Date.parse(today + 'T00:00:00Z')
  const out: Record<string, { decayed: number; velocity: number }> = {}
  const acc: Record<string, { decayed: number; last7: number; prev7: number }> = {}

  for (const row of rows) {
    const weight = WEIGHTS[row.metric]
    if (!weight) continue
    const age = Math.max(0, (todayMs - Date.parse(row.day + 'T00:00:00Z')) / 86_400_000)
    // log compression blunts pulse-style inflation; decay makes it fade
    const signal = weight * Math.log1p(row.n)
    const a = (acc[row.conf_id] ??= { decayed: 0, last7: 0, prev7: 0 })
    a.decayed += signal * Math.pow(0.5, age / HALF_LIFE_DAYS)
    if (age < 7) a.last7 += signal
    else if (age < 14) a.prev7 += signal
  }

  for (const [id, a] of Object.entries(acc)) {
    out[id] = {
      decayed: Math.round(a.decayed * 1000) / 1000,
      // +1 smoothing keeps cold cells finite and dampens tiny-number spikes
      velocity: Math.round(((a.last7 + 1) / (a.prev7 + 1)) * 1000) / 1000,
    }
  }
  return out
}

async function runAggregation(env: Env) {
  const today = new Date().toISOString().slice(0, 10)
  const cutoff = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10)
  const { results } = await env.DB.prepare(
    'SELECT conf_id, day, metric, n FROM counts WHERE day >= ?',
  )
    .bind(cutoff)
    .all<CountRow>()

  const snapshot = {
    generatedAt: new Date().toISOString(),
    conferences: aggregate(results, today),
  }
  await env.CACHE.put('attention', JSON.stringify(snapshot))
  return snapshot
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runAggregation(env))
  },

  // manual trigger / inspection endpoints (useful right after deploy,
  // before the first cron tick). Maintainer-only: requires
  // `Authorization: Bearer <ADMIN_TOKEN>`, and denies everything when the
  // secret is unset rather than defaulting open.
  async fetch(req: Request, env: Env): Promise<Response> {
    const auth = req.headers.get('authorization')
    if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    const url = new URL(req.url)
    if (url.pathname === '/aggregate' && req.method === 'POST') {
      const snapshot = await runAggregation(env)
      return Response.json(snapshot)
    }
    if (url.pathname === '/search-misses') {
      const { results } = await env.DB.prepare(
        'SELECT query, SUM(n) AS total FROM search_miss GROUP BY query ORDER BY total DESC LIMIT 100',
      ).all()
      return Response.json(results)
    }
    return new Response('Not found', { status: 404 })
  },
}
