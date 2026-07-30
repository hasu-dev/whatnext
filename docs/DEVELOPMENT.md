# Development

React + TypeScript + Vite · `d3-hierarchy` treemap · `framer-motion`
transitions · CSS design tokens for both themes · Cloudflare Pages
(+ Functions), one cron Worker, D1, KV.

```bash
npm install
npm run dev        # local dev on http://localhost:5173
npm run build      # validates data, builds data index + OG images + site
npm run validate:data
```

**Scale testing:** append `?stress=N` (max 500) to any page URL to mix N
deterministic synthetic conferences into the map — e.g.
`http://localhost:5173/?stress=200`. Seeded generation keeps runs
reproducible; synthetic ids are prefixed `stress-` and never touch the
real dataset.

## Architecture: cold / hot separation

**Cold data (conferences) lives in the repo** and is bundled at build
time; the read path is static files only — the client never queries a
database at render time.

**Hot data (behavior signals) is sparse writes.** Five aggregate
metrics only — `view`, `open`, `favorite`, `ics`, `share` — posted
fire-and-forget to a Pages Function that UPSERTs `(conf_id, day,
metric)` into D1. No cookies, no user ids, no PII. Zero-result search
queries land in a `search_miss` table as the coverage backlog.

**A cron Worker (every 3h)** reads the last 28 days and computes
`decayed` (intent-weighted `ics > share > favorite > open > view`,
log-compressed, 7-day half-life) and `velocity` (last 7d vs previous
7d), then writes the snapshot to KV, served edge-cached as
`/attention.json`. Tile area blends this with the editorial weight
(cold-start prior only); trending badges use field-normalized velocity
so small venues can surface.

**Sharing:** `/s/{id}` injects OG meta at the edge for crawlers; OG
images are rendered at build time from the same design tokens and
refreshed by a daily rebuild workflow.

## Deploy (Cloudflare)

The site is a **direct-upload Pages project** (`whatnext`): the root
`wrangler.toml` declares the output directory and the D1/KV bindings for
the Pages Functions, so `wrangler pages deploy` needs no dashboard
configuration. The GitHub `Deploy` workflow runs it on every push to
main and once a day (to refresh OG countdowns); it needs two repository
secrets: `CLOUDFLARE_API_TOKEN` (Cloudflare Pages: Edit) and
`CLOUDFLARE_ACCOUNT_ID`.

```bash
# One-time setup
wrangler d1 create whatnext                 # ids → wrangler.toml (root + worker/)
wrangler d1 execute whatnext --file=worker/schema.sql --remote
wrangler kv namespace create whatnext_cache

# Cron aggregator (worker/wrangler.toml)
cd worker
wrangler secret put ADMIN_TOKEN   # guards /aggregate and /search-misses
wrangler deploy
cd ..

# Site: create once, then deploy (CI does this on every push)
wrangler pages project create whatnext --production-branch=main
npm run build
wrangler pages deploy dist
```

Remaining dashboard-only steps: attach the custom domain to the Pages
project, and add a WAF rate-limiting rule on `/api/event`
(e.g. 30 req / 10s / IP, action Block, default duration).
