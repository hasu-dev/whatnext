// Lightweight API on Cloudflare Workers, backed by D1.
// The site itself is static (Cloudflare Pages) and bundles the JSON dataset
// at build time; this API exists for public stats and cross-client data.
export interface Env {
  DB: D1Database
  CACHE?: KVNamespace
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'public, max-age=300',
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    if (url.pathname === '/api/conferences') {
      const { results } = await env.DB.prepare(
        'SELECT id, name, full_name AS fullName, year, field, deadline, location, website, weight, featured FROM conferences ORDER BY weight DESC',
      ).all()
      const rows = results.map((r) => ({ ...r, featured: Boolean(r.featured) }))
      return new Response(JSON.stringify(rows), { headers: JSON_HEADERS })
    }

    if (url.pathname === '/api/stats') {
      const { results } = await env.DB.prepare(
        "SELECT field, COUNT(*) AS count, SUM(CASE WHEN deadline >= date('now') THEN 1 ELSE 0 END) AS open FROM conferences GROUP BY field",
      ).all()
      return new Response(JSON.stringify(results), { headers: JSON_HEADERS })
    }

    return new Response('Not found', { status: 404 })
  },
}
