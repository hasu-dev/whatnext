#!/usr/bin/env node
// Generates worker/seed.sql from data/conferences/*.json.
// Apply with: wrangler d1 execute whatnext --file=worker/schema.sql --file=worker/seed.sql
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'data', 'conferences')
const esc = (s) => String(s).replaceAll("'", "''")

const rows = readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  .map(
    (c) =>
      `('${esc(c.id)}','${esc(c.name)}','${esc(c.fullName)}',${c.year},'${esc(c.field)}','${c.deadline}','${esc(c.location)}',${c.website ? `'${esc(c.website)}'` : 'NULL'},${c.weight},${c.featured ? 1 : 0})`,
  )

const sql = `DELETE FROM conferences;\nINSERT INTO conferences (id,name,full_name,year,field,deadline,location,website,weight,featured) VALUES\n${rows.join(',\n')};\n`
writeFileSync(join(root, 'worker', 'seed.sql'), sql)
console.log(`✓ worker/seed.sql written (${rows.length} rows)`)
