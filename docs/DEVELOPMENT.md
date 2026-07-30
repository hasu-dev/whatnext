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

```bash
# One-time setup
wrangler d1 create whatnext                 # id → worker/wrangler.toml
wrangler d1 execute whatnext --file=worker/schema.sql --remote
wrangler kv namespace create whatnext-cache # id → worker/wrangler.toml

# Cron aggregator
cd worker
wrangler secret put ADMIN_TOKEN   # guards /aggregate and /search-misses
wrangler deploy

# Site → Cloudflare Pages (build command: npm run build, output: dist)
# In the Pages project settings, bind:
#   D1  "DB"    → whatnext        (for /api/event and /s/{id} view counts)
#   KV  "CACHE" → whatnext-cache  (for /attention.json)
# Add a WAF rate-limiting rule on /api/event (e.g. 30 req / 10s / IP).
# Create a deploy hook and store it as the CLOUDFLARE_PAGES_DEPLOY_HOOK
# GitHub secret so the daily-rebuild workflow can refresh OG countdowns.
```
