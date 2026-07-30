#!/usr/bin/env node
// Validates every data/conferences/*.json entry against data/schema.json,
// plus repo-level rules: id must match filename, ids unique, and every tag
// must belong to the controlled vocabulary in data/tags.json.
// Dependency-free on purpose so contributors and CI can run it with bare Node.
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'data', 'conferences')
const schema = JSON.parse(readFileSync(join(root, 'data', 'schema.json'), 'utf8'))
const tagVocab = new Set(JSON.parse(readFileSync(join(root, 'data', 'tags.json'), 'utf8')).tags)

const errors = []
const seenIds = new Set()

const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))

function checkValue(fail, key, rule, val) {
  if (rule.type === 'string') {
    if (typeof val !== 'string') return fail(`"${key}" must be a string`)
    if (rule.pattern && !new RegExp(rule.pattern).test(val)) fail(`"${key}" (“${val}”) does not match ${rule.pattern}`)
    if (rule.minLength && val.length < rule.minLength) fail(`"${key}" too short (min ${rule.minLength})`)
    if (rule.maxLength && val.length > rule.maxLength) fail(`"${key}" too long (max ${rule.maxLength})`)
  } else if (rule.type === 'integer') {
    if (!Number.isInteger(val)) return fail(`"${key}" must be an integer`)
    if (rule.minimum !== undefined && val < rule.minimum) fail(`"${key}" below minimum ${rule.minimum}`)
    if (rule.maximum !== undefined && val > rule.maximum) fail(`"${key}" above maximum ${rule.maximum}`)
  } else if (rule.type === 'boolean') {
    if (typeof val !== 'boolean') fail(`"${key}" must be a boolean`)
  } else if (rule.type === 'array') {
    if (!Array.isArray(val)) return fail(`"${key}" must be an array`)
    if (rule.maxItems !== undefined && val.length > rule.maxItems) fail(`"${key}" has more than ${rule.maxItems} items`)
    if (rule.uniqueItems && new Set(val).size !== val.length) fail(`"${key}" has duplicate items`)
    if (rule.items) for (const item of val) checkValue(fail, `${key}[]`, rule.items, item)
  }
}

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
    if (key in entry) checkValue(fail, key, rule, entry[key])
  }

  if (entry.id) {
    if (`${entry.id}.json` !== file) fail(`id "${entry.id}" must match filename (expected ${entry.id}.json)`)
    if (seenIds.has(entry.id)) fail(`duplicate id "${entry.id}"`)
    seenIds.add(entry.id)
  }
  for (const key of ['deadline', 'abstractDeadline', 'updatedAt']) {
    if (entry[key] && Number.isNaN(Date.parse(entry[key]))) fail(`${key} "${entry[key]}" is not a valid date`)
  }
  if (entry.abstractDeadline && entry.deadline && entry.abstractDeadline > entry.deadline) {
    fail(`abstractDeadline ${entry.abstractDeadline} is after deadline ${entry.deadline}`)
  }
  if (Array.isArray(entry.tags)) {
    for (const t of entry.tags) {
      if (!tagVocab.has(t)) fail(`tag "${t}" is not in data/tags.json — extend the vocabulary in a separate PR first`)
    }
  }
}

if (errors.length > 0) {
  console.error(`✗ ${errors.length} problem(s) found:\n`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`✓ ${files.length} conference entries valid (${tagVocab.size} tags in vocabulary)`)
