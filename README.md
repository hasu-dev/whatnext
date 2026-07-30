# WHATNEXT — Conference Deadline Heatmap

A full-screen, treemap-style heatmap of research conference deadlines.
Tile area = attention; click a tile and it expands in place to show
details. Two complete themes share one component tree, switched purely via
design tokens:

- **Archive Blue** — warm paper background, cobalt accents, editorial serif.
- **Monochrome** — black/white brutalist, bold sans, hairline status tags.

## Stack

- React + TypeScript + Vite
- `d3-hierarchy` computes treemap rects; React renders them
- `framer-motion` animates tiles between layouts (selection re-weighting)
- CSS variables / design tokens for theming (`src/styles/tokens.css`)
- Cloudflare Pages (+ Functions) · one cron Worker · D1 · KV

## Architecture: cold / hot separation

**Cold data (conferences) lives in the repo** — one JSON file per venue in
`data/conferences/`, validated by `data/schema.json` + `data/tags.json`.
The build bundles it into the SPA and into `data/index.json` for the edge.
The read path is static files only; the client never queries D1 at render
time.

**Hot data (behavior signals) is sparse writes.** Five metrics only —
`view`, `open`, `favorite`, `ics`, `share` — posted fire-and-forget to
`/api/event` (Pages Function → D1 UPSERT on `(conf_id, day, metric)`).
No cookies, no user ids, no PII; favorite state itself stays in
localStorage. Zero-result search queries land in `search_miss` as the
coverage backlog. Put a Cloudflare WAF rate-limit rule on `/api/event`.

**Aggregation closes the loop.** A cron Worker (every 3h) reads the last
28 days, computes in JS: `decayed` (intent-weighted `ics > share >
favorite > open > view`, log-compressed, 7-day half-life) and `velocity`
(last 7d vs previous 7d), writes the snapshot to KV, and the edge serves
it as `/attention.json`. The frontend blends it into tile area — the
editorial `weight` is only a cold-start prior — and marks field-normalized
velocity outliers as trending, so small venues can surface and the map
never degrades into a popularity chart.

**Sharing:** `/s/{id}` is a Pages Function that injects `og:*` meta into
the SPA shell at the edge (crawlers don't run JS) and counts one `view`.
OG images are generated at build time (`satori` → `public/og/*.png`) from
the same design tokens as the tiles; a daily rebuild workflow keeps the
"days left" number fresh.

## Develop

```bash
npm install
npm run dev
```

`npm run build` also validates the dataset, regenerates `data/index.json`,
and renders OG images (skipped gracefully when offline).

## Conference data is community-maintained

- **Fix / extend a deadline:** every detail panel has a REPORT button that
  opens a prefilled GitHub issue.
- **Add a conference:** the ADD CONF button in the app collects the fields
  and jumps to GitHub's prefilled new-file page — you open the PR yourself.
  No server-side proxy ever holds a token.
- CI rejects entries that fail the schema, whose `id` ≠ filename, or whose
  tags are outside `data/tags.json`. See **[CONTRIBUTING.md](CONTRIBUTING.md)**.

## Deploy (Cloudflare)

```bash
# One-time setup
wrangler d1 create whatnext                 # id → worker/wrangler.toml
wrangler d1 execute whatnext --file=worker/schema.sql --remote
wrangler kv namespace create whatnext-cache # id → worker/wrangler.toml

# Cron aggregator
cd worker && wrangler deploy

# Site → Cloudflare Pages (build command: npm run build, output: dist)
# In the Pages project settings, bind:
#   D1  "DB"    → whatnext        (for /api/event and /s/{id} view counts)
#   KV  "CACHE" → whatnext-cache  (for /attention.json)
# Add a WAF rate-limiting rule on /api/event (e.g. 30 req / 10s / IP).
# Create a deploy hook and store it as the CLOUDFLARE_PAGES_DEPLOY_HOOK
# GitHub secret so the daily-rebuild workflow can refresh OG countdowns.
```
