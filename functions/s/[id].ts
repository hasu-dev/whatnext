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
  location: string
}

const esc = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url)
  const shell = await ctx.env.ASSETS.fetch(new Request(new URL('/', url)))

  const id = String(ctx.params.id ?? '')
  const conf = (conferences as ConfEntry[]).find((c) => c.id === id)
  if (!conf) return shell // unmatched id falls back to the plain SPA

  const days = Math.ceil((Date.parse(conf.deadline + 'T23:59:59Z') - Date.now()) / 86_400_000)
  const countdown = days < 0 ? 'submissions closed' : `${days} days left`
  const title = `${conf.name} ${conf.year} — deadline ${conf.deadline}`
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
