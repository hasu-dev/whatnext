#!/usr/bin/env node
// Concatenates data/conferences/*.json into data/index.json (gitignored).
// Consumed by the Pages Function that injects OG meta on /s/{id} — the
// read path stays a static, build-time artifact.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'data', 'conferences')

const conferences = readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  .filter((c) => !c.archived)
  .sort((a, b) => b.weight - a.weight)

writeFileSync(join(root, 'data', 'index.json'), JSON.stringify(conferences, null, 2) + '\n')
console.log(`✓ data/index.json written (${conferences.length} conferences)`)
