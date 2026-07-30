<!-- Data PR (adding/updating a conference)? Fill in the section below.
     Code change? Delete the checklist and describe your change instead. -->

## Add / update conference

**Conference:** <!-- e.g. NAACL 2027 -->
**Official CFP link:** <!-- required — the deadline must be verifiable -->

### Checklist

- [ ] One conference per PR
- [ ] Filename is `<confname>-<year>.json` and matches the `id` field
- [ ] Deadline copied from the official CFP (AoE unless `tz` says otherwise)
- [ ] `field` reuses an existing value where one fits
- [ ] `tags` come from `data/tags.json` (propose new tags in a separate PR)
- [ ] `nextCycleExpected` only if the organizers officially announced an
      undated next cycle — no guessing
- [ ] `weight` compared against similar venues (see CONTRIBUTING.md guide)
- [ ] `featured` left `false` unless this is a flagship venue
- [ ] `updatedAt` set to today
- [ ] `npm run validate:data` passes locally
