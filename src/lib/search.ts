import type { Conference } from '../types'

// Minimal query syntax on top of the facet chips (which already give
// OR within a facet and AND across facets):
//   plain text  — fuzzy substring over name / fullName / field / tags
//   #tag        — exact tag match
//   field:xxx   — restrict to the field facet
//   -xxx / NOT  — exclude
//   AND / OR    — uppercase operators; whitespace defaults to AND
// Deliberately no parentheses, nesting, or precedence.

interface Term {
  kind: 'text' | 'tag' | 'field'
  value: string
}

export interface ParsedQuery {
  groups: Term[][] // AND of groups; each group is an OR of terms
  excludes: Term[]
}

function toTerm(raw: string): Term {
  if (raw.startsWith('#') && raw.length > 1) return { kind: 'tag', value: raw.slice(1).toLowerCase() }
  if (raw.toLowerCase().startsWith('field:') && raw.length > 6)
    return { kind: 'field', value: raw.slice(6).toLowerCase() }
  return { kind: 'text', value: raw.toLowerCase() }
}

export function parseQuery(raw: string): ParsedQuery {
  const groups: Term[][] = []
  const excludes: Term[] = []
  let orPending = false
  let notPending = false

  for (const token of raw.trim().split(/\s+/)) {
    if (!token) continue
    if (token === 'AND') continue // whitespace already means AND
    if (token === 'OR') {
      orPending = true
      continue
    }
    if (token === 'NOT') {
      notPending = true
      continue
    }
    const negated = notPending || token.startsWith('-')
    const term = toTerm(token.startsWith('-') ? token.slice(1) : token)
    notPending = false
    if (!term.value) continue
    if (negated) {
      excludes.push(term)
      orPending = false
    } else if (orPending && groups.length > 0) {
      groups[groups.length - 1].push(term)
      orPending = false
    } else {
      groups.push([term])
    }
  }
  return { groups, excludes }
}

function termMatches(term: Term, conf: Conference): boolean {
  switch (term.kind) {
    case 'tag':
      return conf.tags?.includes(term.value) ?? false
    case 'field':
      return conf.field.toLowerCase().includes(term.value)
    case 'text': {
      const hay = `${conf.name} ${conf.fullName} ${conf.field} ${(conf.tags ?? []).join(' ')}`.toLowerCase()
      return hay.includes(term.value)
    }
  }
}

export function matchesQuery(conf: Conference, parsed: ParsedQuery): boolean {
  if (parsed.excludes.some((t) => termMatches(t, conf))) return false
  return parsed.groups.every((group) => group.some((t) => termMatches(t, conf)))
}
