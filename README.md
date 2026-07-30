# what-next.app

*conference heat map*

**Which deadline should you care about next?** what-next.app lays
research conference deadlines out as a full-screen treemap. Urgent
deadlines are solid, approaching ones hatched, closed ones struck
through — one glance tells you where the field's clock is ticking.
Tile sizes start from editorial prominence; as more people use the map,
we hope they'll grow to reflect where the community's attention
actually is.

Built by [hasu.ai](https://hasu.ai). Data is community-maintained on
GitHub — fixing a deadline is one click, adding a conference is one PR.

## Using the map

- **Click a tile** — it expands in place with the full name, venue,
  abstract/paper deadlines, tags, and actions:
  - **ICS** — download a calendar file with a 7-day reminder
  - **Share** — copy a link with a proper social preview card
  - **Report** — prefilled GitHub issue for wrong/extended deadlines
- **Search** (`/` to focus) understands a little syntax: plain text
  fuzzy-matches names and tags, `#llm` matches a tag exactly,
  `field:vision` restricts a facet, `-workshop` or `NOT x` excludes,
  `a OR b` alternates (space means AND).
- **Filter chips** — fields on the left, your **Starred** set and
  **Add conf** on the right. Stars live in your browser only.
- **Timeline** (bottom) — click Week / Month / Quarter / Year to keep
  only deadlines within that horizon; the numbers between anchors count
  deadlines per interval.
- **Keyboard** — `⌘K` zen mode (map only), `H` help pane, `Esc` closes
  things.
- **Statuses** — `URGENT` ≤ 3 weeks · `APPROACHING` ≤ 90 days · `FAR` ·
  `CLOSED` · `TBA` (a next cycle is announced but not yet dated).
- **Two themes** — Archive Blue and Monochrome, one click apart.

## Contributing data

Every conference is one JSON file in
[`data/conferences/`](data/conferences/) named `<confname>-<year>.json`.
The fastest paths start inside the app:

- **Wrong or extended deadline?** Open the detail panel → **Report**.
- **Missing conference?** **Add conf** in the filter row builds the JSON
  and takes you to GitHub's prefilled new-file page — you open the PR.

CI validates every data PR against [`data/schema.json`](data/schema.json)
and the tag vocabulary in [`data/tags.json`](data/tags.json). See
**[CONTRIBUTING.md](CONTRIBUTING.md)** for the field reference and review
criteria. No account, token, or local setup is required beyond GitHub
itself.

## Developers

Stack, architecture, and Cloudflare deployment live in
**[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**.

## License

[MIT](LICENSE) © 2026 [hasu.ai](https://hasu.ai)
