# WHATNEXT — Conference Deadline Heatmap

A full-screen, treemap-style heatmap of research conference deadlines.
Tile area = venue prominence; click a tile and it expands in place to show
details. Two complete themes share one component tree, switched purely via
design tokens:

- **Archive Blue** — warm paper background, cobalt accents, editorial serif.
- **Monochrome** — black/white brutalist, bold sans, hairline status tags.

## Stack

- React + TypeScript + Vite
- `d3-hierarchy` computes treemap rects; React renders them
- `framer-motion` animates tiles between layouts (selection re-weighting)
- CSS variables / design tokens for theming (`src/styles/tokens.css`)
- Cloudflare Pages (hosting) · Workers (`worker/`) · D1 (data) · KV (optional cache)

## Develop

```bash
npm install
npm run dev
```

## Conference data is community-maintained

Every conference is one JSON file in [`data/conferences/`](data/conferences/),
validated against [`data/schema.json`](data/schema.json). To add or update a
conference, copy `_TEMPLATE.json`, fill it in, run `npm run validate:data`,
and open a PR — see **[CONTRIBUTING.md](CONTRIBUTING.md)**. CI validates every
data PR; the site redeploys on merge.

## Deploy (Cloudflare)

```bash
# Frontend → Pages
npm run build   # deploy dist/ via Pages (build command: npm run build)

# API → Workers + D1
cd worker
wrangler d1 create whatnext             # put the id into wrangler.toml
node ../scripts/seed-d1.mjs             # generates seed.sql from data/
wrangler d1 execute whatnext --file=schema.sql --remote
wrangler d1 execute whatnext --file=seed.sql --remote
wrangler deploy
```

The static site bundles the JSON dataset at build time, so the Worker API
(`/api/conferences`, `/api/stats`) is optional and only needed for public
stats endpoints.
