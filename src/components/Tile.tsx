import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CalendarPlus, Flag, Link2, Star, TrendingUp } from 'lucide-react'
import type { TileRect } from '../types'
import { daysUntil, formatCountdown, statusOf } from '../lib/status'
import { reportIssueUrl } from '../lib/github'
import { downloadICS } from '../lib/ics'
import { reportEvent } from '../lib/events'

interface Props {
  rect: TileRect
  selected: boolean
  faved: boolean
  trending: boolean
  onSelect: () => void
  onFave: () => void
  onTagClick: (tag: string) => void
}

const SPRING = { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 } as const

export function Tile({ rect, selected, faved, trending, onSelect, onFave, onTagClick }: Props) {
  const { conf, x, y, w, h } = rect
  const [copied, setCopied] = useState(false)
  const days = daysUntil(conf.deadline)
  const status = statusOf(days)
  const area = w * h

  const copyShareLink = () => {
    const url = `${location.origin}/s/${conf.id}`
    navigator.clipboard?.writeText(url).catch(() => {})
    reportEvent('share', conf.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const tiny = area < 16_000 || h < 84
  const small = area < 45_000
  const large = area > 120_000
  const narrow = w < 150

  const padX = narrow ? 9 : 14
  const avail = w - padX * 2

  // header widgets degrade by priority as width runs out:
  // status tag first, then star + website link, then the field label
  const showIcons = !small
  const iconsW = showIcons ? (conf.website ? 46 : 24) : 0
  const tagW = (status.length + 2) * 6.6 + 16
  const fieldW = conf.field.length * 8.2
  const showStatus = !tiny && avail - iconsW >= tagW
  const showField = !tiny && avail - iconsW - (showStatus ? tagW + 8 : 0) >= fieldW

  // name width budget includes the (YY) superscript (~2.2 chars); the
  // 1.22 factor is sized for the widest theme font (bold Helvetica caps).
  // Below the 9px floor the name can no longer shrink to fit — drop the
  // superscript and let CSS ellipsize instead of clipping.
  const fittedName = (avail * 1.22) / (conf.name.length + 2.2)
  const nameSize = Math.max(9, Math.min(fittedName, h * 0.38, large ? 56 : 34))
  const showSup = fittedName >= 9

  // bottom row: date is fixed, the countdown shrinks into the leftover
  // width and disappears entirely rather than clipping
  const metaSize = w < 100 ? 8 : narrow ? 9 : 11
  const dateW = conf.deadline.length * metaSize * 0.68
  const countdown = formatCountdown(days)
  const cdBase = narrow ? 13 : small ? 16 : Math.max(18, Math.min(w * 0.2, h * 0.3, 64))
  const countdownSize = Math.min(cdBase, (avail - dateW - 10) / (countdown.length * 0.62))
  const showCountdown = !tiny && countdownSize >= 10

  return (
    <motion.div
      className={[
        'tile',
        status === 'URGENT' ? 'is-urgent' : '',
        status === 'APPROACHING' ? 'is-approaching' : '',
        status === 'CLOSED' ? 'is-closed' : '',
        selected ? 'is-selected' : '',
      ].join(' ')}
      initial={false}
      animate={{ left: x, top: y, width: w, height: h }}
      transition={SPRING}
      style={{ padding: narrow ? `9px ${padX}px` : `12px ${padX}px` }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-label={`${conf.name} ${conf.year}, deadline ${conf.deadline}`}
    >
      <div className="tile__row">
        {showField ? <span className="tile__field">{conf.field}</span> : <span />}
        <span className="tile__row" style={{ gap: 6 }}>
          {trending && !tiny && (
            <span className="tile__trend" title="Trending: rising attention within its field">
              <TrendingUp size={11} strokeWidth={2} />
            </span>
          )}
          {showStatus && <span className="tile__status">({status})</span>}
          {showIcons && (
            <button
              className={`tile__star ${faved ? 'is-faved' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onFave()
              }}
              aria-label={faved ? `Unstar ${conf.name}` : `Star ${conf.name}`}
            >
              <Star size={13} strokeWidth={1.5} fill={faved ? 'currentColor' : 'none'} />
            </button>
          )}
          {showIcons && conf.website && (
            <a
              className="tile__link"
              href={conf.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Open ${conf.name} website`}
              title={conf.website}
            >
              <ArrowUpRight size={14} strokeWidth={1.75} />
            </a>
          )}
        </span>
      </div>

      <div style={{ minHeight: 0, overflow: 'hidden', flexGrow: selected && large ? 1 : 0 }}>
        {/* font-size transitions via CSS (see base.css) so text scales
            with the box instead of snapping to its final size */}
        <div className="tile__name" style={{ fontSize: nameSize }}>
          {conf.name}
          {showSup && <sup>({String(conf.year).slice(-2)})</sup>}
        </div>

        {selected && large && (
          <motion.dl
            className="tile__detail"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.28, ease: 'easeOut' }}
          >
            <dt>Full name</dt>
            <dd>{conf.fullName}</dd>
            <dt>Venue</dt>
            <dd>
              {conf.location} — {conf.year}
            </dd>
            {conf.abstractDeadline && (
              <>
                <dt>Abstract deadline</dt>
                <dd>{conf.abstractDeadline}</dd>
              </>
            )}
            <dt>Submission deadline</dt>
            <dd>
              {conf.deadline} ({status === 'CLOSED' ? 'closed' : `${days} days left`}, {conf.tz ?? 'AoE'})
            </dd>
            {conf.website && (
              <>
                <dt>Website</dt>
                <dd>
                  <a
                    href={conf.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {conf.website.replace(/^https:\/\//, '')} ↗
                  </a>
                </dd>
              </>
            )}
            {conf.tags && conf.tags.length > 0 && (
              <>
                <dt>Tags</dt>
                <dd className="tile__tags">
                  {conf.tags.map((t) => (
                    <button
                      key={t}
                      className="tile__tag"
                      onClick={(e) => {
                        e.stopPropagation()
                        onTagClick(t)
                      }}
                    >
                      #{t}
                    </button>
                  ))}
                </dd>
              </>
            )}
            <dd className="tile__actions">
              <button
                className="tile__action"
                onClick={(e) => {
                  e.stopPropagation()
                  downloadICS(conf)
                  reportEvent('ics', conf.id)
                }}
              >
                <CalendarPlus size={11} strokeWidth={1.75} /> ICS
              </button>
              <button
                className="tile__action"
                onClick={(e) => {
                  e.stopPropagation()
                  copyShareLink()
                }}
              >
                <Link2 size={11} strokeWidth={1.75} /> {copied ? 'COPIED' : 'SHARE'}
              </button>
              <a
                className="tile__action"
                href={reportIssueUrl(conf)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Report a wrong or extended deadline via a prefilled GitHub issue"
              >
                <Flag size={11} strokeWidth={1.75} /> REPORT
              </a>
            </dd>
            <dd className="tile__freshness">DATA VERIFIED {conf.updatedAt}</dd>
          </motion.dl>
        )}
      </div>

      {/* the detail block already states the deadline, so the bottom row
          yields its space to it while expanded (crossfading with the
          detail's entrance) */}
      <AnimatePresence initial={false}>
        {!(selected && large) && (
          <motion.div
            className="tile__row"
            style={{ alignItems: 'flex-end' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="tile__meta" style={{ fontSize: metaSize }}>
              <span>{conf.deadline}</span>
              {large && !selected && <span style={{ opacity: 0.6 }}>{conf.field}</span>}
            </div>
            {showCountdown && (
              <div className="tile__countdown" style={{ fontSize: countdownSize }}>
                {countdown}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
