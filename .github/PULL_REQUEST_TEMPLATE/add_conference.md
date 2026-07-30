## Add / update conference

**Conference:** <!-- e.g. NAACL 2027 -->
**Official CFP link:** <!-- required — deadline must be verifiable -->

### Checklist

- [ ] One conference per PR
- [ ] Filename matches the `id` field (`<id>.json`)
- [ ] Deadline copied from the official CFP (AoE date)
- [ ] `field` reuses an existing tag where one fits
- [ ] `weight` compared against similar venues (see CONTRIBUTING.md guide)
- [ ] `featured` left `false` unless this is a flagship venue
- [ ] `npm run validate:data` passes locally
