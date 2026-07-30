// Tier-1 signal collection endpoint. Aggregate counts only:
// (conf_id, day, metric) UPSERT +1 — no per-user records, no event stream,
// no cookies, no PII. Put a Cloudflare WAF rate-limiting rule on /api/event
// (see README); no user identifiers are used for dedup by design.

import conferences from '../../data/index.json'

interface Env {
  DB?: D1Database
}

const METRICS = new Set(['view', 'open', 'favorite', 'ics', 'share'])

// only real dataset entries may be counted — bounds table cardinality and
// keeps synthetic/fabricated ids (e.g. dev stress fixtures) out of D1
const KNOWN_IDS = new Set((conferences as Array<{ id: string }>).map((c) => c.id))

export async function upsertCount(db: D1Database, confId: string, metric: string) {
  const day = new Date().toISOString().slice(0, 10)
  await db
    .prepare(
      'INSERT INTO counts (conf_id, day, metric, n) VALUES (?, ?, ?, 1) ON CONFLICT(conf_id, day, metric) DO UPDATE SET n = n + 1',
    )
    .bind(confId, day, metric)
    .run()
}

async function upsertSearchMiss(db: D1Database, query: string) {
  const day = new Date().toISOString().slice(0, 10)
  await db
    .prepare(
      'INSERT INTO search_miss (query, day, n) VALUES (?, ?, 1) ON CONFLICT(query, day) DO UPDATE SET n = n + 1',
    )
    .bind(query, day)
    .run()
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: { metric?: string; conf?: string; query?: string }
  try {
    body = await ctx.request.json()
  } catch {
    return new Response(null, { status: 400 })
  }

  const db = ctx.env.DB
  if (!db) return new Response(null, { status: 204 }) // local dev / unbound

  try {
    if (body.metric === 'searchmiss') {
      const q = (body.query ?? '').trim().toLowerCase().slice(0, 80)
      if (!q) return new Response(null, { status: 400 })
      await upsertSearchMiss(db, q)
    } else if (body.metric && METRICS.has(body.metric) && body.conf && KNOWN_IDS.has(body.conf)) {
      await upsertCount(db, body.conf, body.metric)
    } else {
      return new Response(null, { status: 400 })
    }
  } catch {
    // counting must never surface errors to the client
  }
  return new Response(null, { status: 204 })
}
