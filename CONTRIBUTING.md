# Contributing a conference

The conference dataset is community-maintained. Every conference is a single
JSON file in [`data/conferences/`](data/conferences/), and adding one is a
small pull request — no code changes needed. The site rebuilds automatically
when a PR is merged.

**The fastest paths start in the app itself:**

- **Wrong or extended deadline?** Open the conference's detail panel and hit
  **REPORT** — it opens a prefilled GitHub issue (one click, no template
  hunting).
- **Adding a conference?** Hit **ADD CONF** in the filter row — the form
  assembles the JSON and jumps to GitHub's prefilled new-file page where you
  open the PR yourself.

## Add a conference in 4 steps

1. **Copy the template.**
   Duplicate [`data/conferences/_TEMPLATE.json`](data/conferences/_TEMPLATE.json)
   and name it after your conference's lowercase slug, e.g. `naacl.json`.
   The filename must equal the `id` field.

2. **Fill in the fields.**

   | Field | Meaning | Example |
   |---|---|---|
   | `id` | Lowercase slug, must match the filename | `naacl` |
   | `name` | Short uppercase display name | `NAACL` |
   | `fullName` | Official conference name | `North American Chapter of the ACL` |
   | `year` | Edition year of the conference (not the deadline year) | `2027` |
   | `field` | Uppercase primary classification (single value) — reuse one if it fits | `NLP` |
   | `tags` | Optional, max 8, lowercase-hyphen slugs from [`data/tags.json`](data/tags.json) | `["nlp", "llm"]` |
   | `deadline` | Paper submission deadline, `YYYY-MM-DD` | `2026-12-15` |
   | `abstractDeadline` | Optional earlier abstract deadline | `2026-12-08` |
   | `tz` | Optional timezone; omit for AoE | `AoE` |
   | `location` | `City, Country` | `Vancouver, Canada` |
   | `website` | Official site, `https://` only | `https://naacl.org` |
   | `weight` | Cold-start prior for tile size, 1–25 (see guide below) | `9` |
   | `featured` | Flagship-venue flag, keep rare | `false` |
   | `updatedAt` | Date you verified this entry, `YYYY-MM-DD` | `2026-07-30` |

   **Tags** must come from the controlled vocabulary in
   [`data/tags.json`](data/tags.json) — CI rejects anything else. Missing a
   tag? Propose it in a separate PR that only touches `tags.json`.

   Do **not** add status or days-remaining fields; both are derived from
   `deadline` at render time. For past editions, set `"archived": true`
   instead of deleting the file — archived entries leave the live treemap.

   **Weight guide:** top-tier flagship venues (NeurIPS, CVPR, ICML) 18–22 ·
   major venues (ACL, CHI, KDD) 10–16 · strong specialized venues 5–9 ·
   niche/regional 1–4. When unsure, compare with neighbors in the same field.

   **Featured:** keep `featured: true` rare (~1 in 4 entries). It is meant for
   venues a whole field plans its year around. Maintainers may adjust it.

3. **Validate locally** (bare Node, no install needed):

   ```bash
   npm run validate:data
   ```

4. **Open a pull request** with one conference per PR. Fill in the PR
   template checklist; CI runs the same validator against your change.

## Updating an existing conference

Same process — edit the file in place. Typical updates:

- New edition announced → bump `year`, `deadline`, `location`, `website`.
- Deadline extended → update `deadline` and link the announcement in the PR.

## Review criteria

Maintainers check that the venue is a real, peer-reviewed conference (or an
established workshop series), that the deadline matches the official CFP, and
that `weight`/`featured` are in line with comparable venues. Deadline sources
must be the official site — please link the CFP page in your PR description.
