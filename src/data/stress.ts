import type { Conference } from '../types'
import tagsVocab from '../../data/tags.json'

// Deterministic synthetic dataset for stress-testing the treemap at
// future scale (hundreds of venues). Activated via ?stress=N — never part
// of the real community dataset. Seeded PRNG keeps every run identical.

const FIELDS = [
  'AI',
  'AI/ML',
  'VISION',
  'NLP',
  'LEARNING',
  'DATA',
  'SYSTEMS',
  'GRAPHICS',
  'HCI',
  'ROBOTICS',
  'SECURITY',
  'THEORY',
  'PL',
  'NETWORKS',
  'XR',
]

function lcg(seed: number) {
  let s = seed
  return () => (s = (s * 48271) % 2147483647) / 2147483647
}

export function generateStressConferences(n: number): Conference[] {
  const rand = lcg(42)
  const out: Conference[] = []
  const used = new Set<string>()

  for (let i = 0; i < n; i++) {
    let name = ''
    const len = 3 + Math.floor(rand() * 4)
    for (let j = 0; j < len; j++) name += String.fromCharCode(65 + Math.floor(rand() * 26))
    while (used.has(name)) name += String.fromCharCode(65 + Math.floor(rand() * 26))
    used.add(name)

    // long-tail prominence: a few flagships, many niche venues
    const r = rand()
    const weight =
      r > 0.97
        ? 18 + Math.floor(rand() * 5)
        : r > 0.85
          ? 10 + Math.floor(rand() * 6)
          : r > 0.5
            ? 5 + Math.floor(rand() * 5)
            : 1 + Math.floor(rand() * 4)

    // deadlines spread from 120 days past to 400 days out
    const days = Math.floor(rand() * 520) - 120
    const d = new Date(Date.now() + days * 86_400_000)
    const year = d.getFullYear() + 1

    out.push({
      id: `stress-${name.toLowerCase()}-${year}`,
      name,
      fullName: `Synthetic Conference on ${name} Research (stress fixture)`,
      year,
      field: FIELDS[Math.floor(rand() * FIELDS.length)],
      tags: tagsVocab.tags.filter(() => rand() < 0.08).slice(0, 5),
      deadline: `${d.toISOString().slice(0, 10)}T23:59:59`,
      location: 'Stress City, Testland',
      weight,
      featured: rand() > 0.9,
      updatedAt: new Date().toISOString().slice(0, 10),
      ...(days < 0 && rand() > 0.7 ? { nextCycleExpected: '2027-03' } : {}),
    })
  }
  return out
}
