#!/usr/bin/env node
// Validates every data/conferences/*.json entry against data/schema.json.
// Dependency-free on purpose so contributors and CI can run it with bare Node.
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'data', 'conferences')
const schema = JSON.parse(readFileSync(join(root, 'data', 'schema.json'), 'utf8'))

const errors = []
const seenIds = new Set()

const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))

for (const file of files) {
  const path = join(dir, file)
  let entry
  try {
    entry = JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    errors.push(`${file}: invalid JSON — ${e.message}`)
    continue
  }

  const fail = (msg) => errors.push(`${file}: ${msg}`)

  for (const key of schema.required) {
    if (!(key in entry)) fail(`missing required field "${key}"`)
  }
  for (const key of Object.keys(entry)) {
    if (!(key in schema.properties)) fail(`unknown field "${key}"`)
  }

  for (const [key, rule] of Object.entries(schema.properties)) {
    if (!(key in entry)) continue
    const val = entry[key]
    if (rule.type === 'string') {
      if (typeof val !== 'string') fail(`"${key}" must be a string`)
      else {
        if (rule.pattern && !new RegExp(rule.pattern).test(val)) fail(`"${key}" (“${val}”) does not match ${rule.pattern}`)
        if (rule.minLength && val.length < rule.minLength) fail(`"${key}" too short (min ${rule.minLength})`)
        if (rule.maxLength && val.length > rule.maxLength) fail(`"${key}" too long (max ${rule.maxLength})`)
      }
    } else if (rule.type === 'integer') {
      if (!Number.isInteger(val)) fail(`"${key}" must be an integer`)
      else {
        if (rule.minimum !== undefined && val < rule.minimum) fail(`"${key}" below minimum ${rule.minimum}`)
        if (rule.maximum !== undefined && val > rule.maximum) fail(`"${key}" above maximum ${rule.maximum}`)
      }
    } else if (rule.type === 'boolean' && typeof val !== 'boolean') {
      fail(`"${key}" must be a boolean`)
    }
  }

  if (entry.id) {
    if (`${entry.id}.json` !== file) fail(`id "${entry.id}" must match filename (expected ${entry.id}.json)`)
    if (seenIds.has(entry.id)) fail(`duplicate id "${entry.id}"`)
    seenIds.add(entry.id)
  }
  if (entry.deadline && Number.isNaN(Date.parse(entry.deadline))) {
    fail(`deadline "${entry.deadline}" is not a valid date`)
  }
}

if (errors.length > 0) {
  console.error(`✗ ${errors.length} problem(s) found:\n`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`✓ ${files.length} conference entries valid`)
