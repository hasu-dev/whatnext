#!/usr/bin/env node
// Build-time OG image generation (satori → PNG in public/og/).
// Deliberately NOT runtime: social platforms cache OG images for a long
// time, so runtime rendering adds ops for zero benefit. A daily cron
// rebuild refreshes the "days left" number.
//
// Visuals reuse the Archive Blue design tokens and mirror a treemap tile:
// accent field label, serif conference name, big countdown. Status drives
// the fill exactly like tiles do (urgent = solid accent).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'og')
const cacheDir = join(root, '.cache', 'fonts')

// tokens (mirror src/styles/tokens.css — archive theme)
const T = {
  paper: '#f2eee4',
  ink: '#1d232e',
  accent: '#2c3ee0',
  accentInk: '#f2eee4',
  mutedOnPaper: 'rgba(44, 62, 224, 0.75)',
  closedInk: 'rgba(29, 35, 46, 0.35)',
}

const FONTS = [
  { name: 'PT Serif', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/ptserif/PT_Serif-Web-Regular.ttf', file: 'ptserif.ttf' },
  { name: 'IBM Plex Mono', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/IBMPlexMono-Regular.ttf', file: 'plexmono.ttf' },
]

async function loadFonts() {
  mkdirSync(cacheDir, { recursive: true })
  const fonts = []
  for (const f of FONTS) {
    const path = join(cacheDir, f.file)
    if (!existsSync(path)) {
      const res = await fetch(f.url)
      if (!res.ok) throw new Error(`font fetch failed: ${f.url} → ${res.status}`)
      writeFileSync(path, Buffer.from(await res.arrayBuffer()))
    }
    fonts.push({ name: f.name, data: readFileSync(path), weight: 400, style: 'normal' })
  }
  return fonts
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// mirrors src/lib/status.ts: cutoff = end of the deadline day in the
// entry's timezone, default AoE (UTC-12)
function tzOffset(tz) {
  if (!tz || tz === 'AoE') return '-12:00'
  if (tz === 'UTC') return '+00:00'
  const m = /^UTC([+-])(\d{1,2})(?::(\d{2}))?$/.exec(tz)
  if (m) return `${m[1]}${m[2].padStart(2, '0')}:${m[3] ?? '00'}`
  return '-12:00'
}

function statusOf(days, nextCycleExpected) {
  if (days < 0) {
    if (nextCycleExpected && nextCycleExpected >= new Date().toISOString().slice(0, 7)) return 'TBA'
    return 'CLOSED'
  }
  if (days <= 21) return 'URGENT'
  if (days <= 90) return 'APPROACHING'
  return 'FAR'
}

function countdownText(days, status, nextCycleExpected) {
  if (status === 'TBA' && nextCycleExpected) {
    const [y, m] = nextCycleExpected.split('-')
    return `${MONTHS[Number(m) - 1] ?? m} '${y.slice(-2)}`
  }
  return `${days}d`
}

function tileMarkup(conf, countdown, status) {
  const urgent = status === 'URGENT'
  const closed = status === 'CLOSED'
  const bg = urgent ? T.accent : T.paper
  const ink = urgent ? T.accentInk : closed ? T.closedInk : T.accent
  const mono = { fontFamily: 'IBM Plex Mono', letterSpacing: '0.12em' }

  return {
    type: 'div',
    props: {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: bg,
        color: ink,
        border: `3px solid ${urgent ? T.accent : T.accent}`,
        padding: '48px 56px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...mono, fontSize: 26 },
            children: [
              { type: 'span', props: { children: conf.field } },
              {
                type: 'span',
                props: {
                  style: { border: `2px solid ${ink}`, padding: '6px 16px', fontSize: 22 },
                  children: `(${status})`,
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column' },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: 'PT Serif',
                    fontSize: Math.min(150, 1050 / conf.name.length + 40),
                    lineHeight: 1,
                    textDecoration: closed ? 'line-through' : 'none',
                  },
                  children: `${conf.name} (${String(conf.year).slice(-2)})`,
                },
              },
              {
                type: 'div',
                props: {
                  style: { ...mono, fontSize: 28, marginTop: 20, opacity: 0.85, display: 'flex' },
                  children: conf.fullName.slice(0, 64),
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
            children: [
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column', ...mono, fontSize: 26 },
                  children: [
                    { type: 'span', props: { children: `DEADLINE ${conf.deadline.slice(0, 10)}` } },
                    { type: 'span', props: { style: { opacity: 0.6, fontSize: 20, marginTop: 8 }, children: 'WHATNEXT — CONFERENCE DEADLINES' } },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: { fontFamily: 'PT Serif', fontSize: 130, lineHeight: 1 },
                  children: countdown,
                },
              },
            ],
          },
        },
      ],
    },
  }
}

async function main() {
  let fonts
  try {
    fonts = await loadFonts()
  } catch (e) {
    // never hard-fail the build over OG assets (e.g. offline local build)
    console.warn(`⚠ skipping OG generation: ${e.message}`)
    return
  }

  const conferences = JSON.parse(readFileSync(join(root, 'data', 'index.json'), 'utf8'))
  mkdirSync(outDir, { recursive: true })

  for (const conf of conferences) {
    const stamp = conf.deadline.includes('T') ? conf.deadline : `${conf.deadline}T23:59:59`
    const msLeft = Date.parse(`${stamp}${tzOffset(conf.tz)}`) - Date.now()
    const days = msLeft >= 0 ? Math.ceil(msLeft / 86_400_000) : Math.floor(msLeft / 86_400_000)
    const status = statusOf(days, conf.nextCycleExpected)
    const countdown = countdownText(days, status, conf.nextCycleExpected)
    const svg = await satori(tileMarkup(conf, countdown, status), { width: 1200, height: 630, fonts })
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()
    writeFileSync(join(outDir, `${conf.id}.png`), png)
  }
  console.log(`✓ ${conferences.length} OG images written to public/og/`)
}

main().catch((e) => {
  console.warn(`⚠ OG generation failed (non-fatal): ${e.message}`)
})
