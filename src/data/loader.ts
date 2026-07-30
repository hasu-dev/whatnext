import type { Conference } from '../types'

// Every conference lives as one JSON file in /data/conferences/ so the
// dataset can be community-maintained via pull requests. See CONTRIBUTING.md.
const modules = import.meta.glob<Conference>('/data/conferences/*.json', {
  eager: true,
  import: 'default',
})

export function loadConferences(): Conference[] {
  return Object.entries(modules)
    .filter(([path]) => !path.includes('_TEMPLATE'))
    .map(([, conf]) => conf)
    .sort((a, b) => b.weight - a.weight)
}
