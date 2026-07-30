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
   and name it `<confname>-<year>.json`, e.g. `naacl-2027.json`. The
   filename must equal the `id` field, and the id must end with the
   edition year — each year's edition is its own file, so past editions
   can be kept (`"archived": true`) alongside the current one.

2. **Fill in the fields.**

   | Field | Meaning | Example |
   |---|---|---|
   | `id` | `<confname>-<year>`, must match the filename | `naacl-2027` |
   | `name` | Short uppercase display name | `NAACL` |
   | `fullName` | Official conference name | `North American Chapter of the ACL` |
   | `year` | Edition year of the conference (not the deadline year) | `2027` |
   | `field` | Uppercase primary classification (single value) — reuse one if it fits | `NLP` |
   | `tags` | Optional, max 8, lowercase-hyphen slugs from [`data/tags.json`](data/tags.json) | `["nlp", "llm"]` |
   | `deadline` | Paper submission deadline, `YYYY-MM-DD` | `2026-12-15` |
   | `abstractDeadline` | Optional earlier abstract deadline | `2026-12-08` |
   | `deadlineNote` | Optional qualifier shown under the deadline | `Cycle 1` |
   | `nextCycleExpected` | Optional `YYYY-MM` of an announced next cycle whose date isn't published — renders the entry as TBA instead of CLOSED | `2027-02` |
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
   `deadline` (and `nextCycleExpected`) at render time. For past editions,
   set `"archived": true` instead of deleting the file — archived entries
   leave the live treemap.

   **`nextCycleExpected`** is only for cycles/editions the organizers have
   *officially announced* without a date. Never guess a month; once the
   date is published, replace `deadline` and remove this field.

   **Weight guide:** weight is only the *initial* tile size — live attention
   signals take over once the entry is in use. The in-app Add conf form maps
   tiers to Flagship 20 · Major 12 · Specialized 7 · Niche 3; hand-written
   entries can use anything 1–25 (flagship 18–22, major 10–16, specialized
   5–9, niche 1–4). When unsure, compare with neighbors in the same field.

   **Featured:** keep `featured: true` rare (~1 in 4 entries). It is meant for
   venues a whole field plans its year around. Maintainers may adjust it.

3. **Validate locally** (bare Node, no install needed):

   ```bash
   npm run validate:data
   ```

4. **Open a pull request** with one conference per PR. Fill in the PR
   template checklist; CI runs the same validator against your change.

## Updating an existing conference

Each edition is its own file, so the update depends on what changed:

- **Deadline extended / corrected** → edit the edition's file in place,
  update `updatedAt`, and link the announcement in the PR.
- **Next submission cycle gets a date** (multi-cycle venues) → replace
  `deadline`/`abstractDeadline` with the new cycle's dates, adjust
  `deadlineNote`, remove `nextCycleExpected`.
- **New edition announced** → add a new `<confname>-<newyear>.json` file
  and set `"archived": true` on the previous edition so the live map stays
  lean. Don't edit the year in place.

## Review criteria

Maintainers check that the venue is a real, peer-reviewed conference (or an
established workshop series), that the deadline matches the official CFP, and
that `weight`/`featured` are in line with comparable venues. Deadline sources
must be the official site — please link the CFP page in your PR description.
