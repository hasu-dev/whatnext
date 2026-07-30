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

function statusOf(days) {
  if (days < 0) return 'CLOSED'
  if (days <= 21) return 'URGENT'
  if (days <= 90) return 'APPROACHING'
  return 'FAR'
}

function tileMarkup(conf, days, status) {
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
                    { type: 'span', props: { children: `DEADLINE ${conf.deadline}` } },
                    { type: 'span', props: { style: { opacity: 0.6, fontSize: 20, marginTop: 8 }, children: 'WHATNEXT — CONFERENCE DEADLINES' } },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: { fontFamily: 'PT Serif', fontSize: 130, lineHeight: 1 },
                  children: `${days}d`,
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
    const days = Math.ceil((Date.parse(conf.deadline + 'T23:59:59Z') - Date.now()) / 86_400_000)
    const status = statusOf(days)
    const svg = await satori(tileMarkup(conf, days, status), { width: 1200, height: 630, fonts })
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()
    writeFileSync(join(outDir, `${conf.id}.png`), png)
  }
  console.log(`✓ ${conferences.length} OG images written to public/og/`)
}

main().catch((e) => {
  console.warn(`⚠ OG generation failed (non-fatal): ${e.message}`)
})
