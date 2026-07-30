import type { Conference } from '../types'
import { generateStressConferences } from './stress'

// Every conference lives as one JSON file in /data/conferences/ so the
// dataset can be community-maintained via pull requests. See CONTRIBUTING.md.
const modules = import.meta.glob<Conference>('/data/conferences/*.json', {
  eager: true,
  import: 'default',
})

export function loadConferences(): Conference[] {
  const real = Object.entries(modules)
    .filter(([path]) => !path.includes('_TEMPLATE'))
    .map(([, conf]) => conf)
    .filter((conf) => !conf.archived)
    .sort((a, b) => b.weight - a.weight)

  // ?stress=N appends deterministic synthetic venues for scale testing
  const stressN = Math.min(500, Number(new URLSearchParams(location.search).get('stress')) || 0)
  if (stressN > 0) return [...real, ...generateStressConferences(stressN)]
  return real
}
