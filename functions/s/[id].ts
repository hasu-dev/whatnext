// Share route /s/{id}: social crawlers never execute the SPA's JS, so OG
// meta must be injected at the edge. We read the static conference index
// (bundled at build time — no D1 on the read path), inject og:* into the
// SPA shell's <head>, and return it; humans still hydrate normally.
// A visit here also counts one `view` event — sharing closes the loop.

import conferences from '../../data/index.json'
import { upsertCount } from '../api/event'

interface Env {
  DB?: D1Database
  ASSETS: { fetch: (req: Request) => Promise<Response> }
}

interface ConfEntry {
  id: string
  name: string
  fullName: string
  year: number
  field: string
  deadline: string
  nextCycleExpected?: string
  tz?: string
  location: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2027-01" → "Jan 2027" */
const expectedMonth = (ym: string) => {
  const [y, m] = ym.split('-')
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`
}

/** "2027-01" → "2027-01-31" — cutoff math for estimated (YYYY-MM) deadlines */
const endOfMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return `${ym}-${new Date(Date.UTC(y, m, 0)).getUTCDate()}`
}

const esc = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

// mirrors src/lib/status.ts: cutoff = end of the deadline day in the
// entry's timezone, default AoE (UTC-12)
function tzOffset(tz?: string): string {
  if (!tz || tz === 'AoE') return '-12:00'
  if (tz === 'UTC') return '+00:00'
  const m = /^UTC([+-])(\d{1,2})(?::(\d{2}))?$/.exec(tz)
  if (m) return `${m[1]}${m[2].padStart(2, '0')}:${m[3] ?? '00'}`
  return '-12:00'
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url)
  const shell = await ctx.env.ASSETS.fetch(new Request(new URL('/', url)))

  const id = String(ctx.params.id ?? '')
  const conf = (conferences as ConfEntry[]).find((c) => c.id === id)
  if (!conf) return shell // unmatched id falls back to the plain SPA

  // a bare YYYY-MM deadline is an estimated month (mirrors src/lib/status.ts)
  const estimated = conf.deadline.length === 7
  const withDay = estimated ? endOfMonth(conf.deadline) : conf.deadline
  const stamp = withDay.includes('T') ? withDay : `${withDay}T23:59:59`
  const msLeft = Date.parse(`${stamp}${tzOffset(conf.tz)}`) - Date.now()
  // mirrors src/lib/status.ts statusOf: a passed deadline with an announced
  // future cycle month is TBA, not closed — keep previews consistent with
  // the app UI and the OG image
  const tba =
    msLeft < 0 &&
    !!conf.nextCycleExpected &&
    conf.nextCycleExpected >= new Date().toISOString().slice(0, 7)
  const countdown = tba
    ? `next cycle expected ${expectedMonth(conf.nextCycleExpected!)}, date TBA`
    : estimated
      ? `deadline expected ~${expectedMonth(conf.deadline)}`
      : msLeft < 0
        ? 'submissions closed'
        : `${Math.ceil(msLeft / 86_400_000)} days left`
  const title = tba
    ? `${conf.name} ${conf.year} — deadline TBA`
    : estimated
      ? `${conf.name} ${conf.year} — deadline ~${expectedMonth(conf.deadline)} (estimated)`
      : `${conf.name} ${conf.year} — deadline ${conf.deadline.slice(0, 10)}`
  const description = `${conf.fullName} · ${conf.location} · ${countdown}. Track it on WHATNEXT.`
  const image = `${url.origin}/og/${conf.id}.png`
  const canonical = `${url.origin}/s/${conf.id}`

  const meta = [
    `<title>${esc(title)}</title>`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`,
    `<meta property="og:type" content="website">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="description" content="${esc(description)}">`,
  ].join('\n    ')

  const html = (await shell.text()).replace('</head>', `    ${meta}\n  </head>`)

  if (ctx.env.DB) {
    ctx.waitUntil(upsertCount(ctx.env.DB, conf.id, 'view').catch(() => {}))
  }

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
