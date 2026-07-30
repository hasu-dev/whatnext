import type { Conference } from '../types'

// Repo that hosts the community dataset. All maintenance flows are plain
// prefilled GitHub URLs — no server-side proxy ever holds a token.
export const GITHUB_REPO = 'https://github.com/hasu-dev/whatnext'
export const GITHUB_BRANCH = 'main'

/** Prefilled issue for reporting a wrong/extended deadline or bad data. */
export function reportIssueUrl(conf: Conference): string {
  const title = `[data] ${conf.name} ${conf.year}: deadline / info update`
  const body = [
    `**Conference:** \`${conf.id}\` (${conf.fullName})`,
    `**Currently listed deadline:** ${conf.deadline}${conf.abstractDeadline ? ` (abstract: ${conf.abstractDeadline})` : ''}`,
    `**Entry last verified:** ${conf.updatedAt}`,
    '',
    '### What is wrong / what changed?',
    '',
    '<!-- e.g. deadline extended to 2026-09-30 -->',
    '',
    '### Source (official CFP link, required)',
    '',
    '<!-- link to the announcement -->',
  ].join('\n')
  const q = new URLSearchParams({ title, body, labels: 'data' })
  return `${GITHUB_REPO}/issues/new?${q}`
}

/**
 * Prefilled new-file PR for adding a conference. GitHub's /new/ route
 * accepts filename + value query params; /edit/ does not support value
 * prefill, which is why edits go through issues instead.
 */
export function newConferenceUrl(entry: Record<string, unknown>): string {
  const q = new URLSearchParams({
    filename: `data/conferences/${entry.id}.json`,
    value: JSON.stringify(entry, null, 2) + '\n',
  })
  return `${GITHUB_REPO}/new/${GITHUB_BRANCH}?${q}`
}
