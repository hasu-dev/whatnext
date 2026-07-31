import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CalendarPlus, Flag, Link2, Star, TrendingUp } from 'lucide-react'
import type { TileRect } from '../types'
import {
  daysUntil,
  deadlineCutoffMs,
  deadlineDate,
  formatCountdown,
  formatExpectedMonth,
  formatLocalCutoff,
  formatRemaining,
  statusOf,
  tzLabel,
} from '../lib/status'
import { reportIssueUrl } from '../lib/github'
import { downloadICS } from '../lib/ics'
import { reportEvent } from '../lib/events'
import { shareConference } from '../lib/share'

interface Props {
  rect: TileRect
  selected: boolean
  faved: boolean
  trending: boolean
  onSelect: () => void
  onFave: () => void
  onTagClick: (tag: string) => void
  /** micro tiles report hover so the map can show a peek card */
  onPeek: (rect: TileRect | null) => void
}

const SPRING = { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 } as const

export function Tile({ rect, selected, faved, trending, onSelect, onFave, onTagClick, onPeek }: Props) {
  const { conf, x, y, w, h } = rect
  const [copied, setCopied] = useState(false)
  const days = daysUntil(conf.deadline, conf.tz)
  const status = statusOf(days, conf.nextCycleExpected)
  const area = w * h

  const share = async () => {
    // native share sheet on touch devices, clipboard elsewhere
    const result = await shareConference(conf)
    if (result === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    }
  }

  const tiny = area < 16_000 || h < 84
  const small = area < 45_000
  // detail eligibility: big by area, or big enough in both dimensions —
  // phone-sized maps can never reach the desktop area threshold even
  // when the selected tile fills most of the screen
  const large = area > 120_000 || (w >= 280 && h >= 320)
  const narrow = w < 150
  // vertical room left for the name once padding, the header row, and the
  // bottom row have taken theirs — the column layout must never let the
  // name clip against its neighbors
  const nameVBudget = h - 24 - (tiny ? 12 : 26) - 30
  // squashed-flat tiles (short strips) switch to a single centered row
  // instead of a cramped column
  const flat = h < 84 || nameVBudget < 14
  // at heat-map scale (hundreds of venues) the smallest cells hold just a
  // centered name — or nothing but a hover title when even that can't fit
  const micro = area < 5_500 || w < 52 || h < 40
  const labelless = area < 1_800 || w < 30 || h < 20

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
  const nameSize = Math.max(
    9,
    Math.min(fittedName, h * 0.38, large ? 56 : 34, flat ? Infinity : nameVBudget),
  )
  const showSup = fittedName >= 9

  // the expanded detail renders progressively: estimate the vertical room
  // left under the name and drop low-priority rows before anything clips.
  // Requirements are computed from THIS conference's actual rows (abstract
  // deadline, notes, tag count, name length), cumulatively by priority:
  // core (venue/deadline/website/actions) → tags → full name → freshness.
  const detailBudget = h - 24 - 26 - nameSize * 1.1
  const tagCount = conf.tags?.length ?? 0
  const coreNeed =
    39 + // venue
    (conf.abstractDeadline ? 39 : 0) +
    57 + // deadline incl. local-time line
    (conf.deadlineNote ? 18 : 0) +
    (conf.nextCycleExpected ? 18 : 0) +
    (conf.website ? 39 : 0) +
    84 // actions row incl. rule + margins
  const tagsNeed = tagCount > 0 ? 20 + Math.ceil(tagCount / 3) * 26 : 0
  const fullNameNeed = 20 + Math.ceil(conf.fullName.length / 38) * 19
  const showDetail = selected && large && detailBudget >= coreNeed
  const showDetailTags = tagCount > 0 && detailBudget >= coreNeed + tagsNeed
  const showDetailFullName = detailBudget >= coreNeed + tagsNeed + fullNameNeed
  const showDetailFreshness = detailBudget >= coreNeed + tagsNeed + fullNameNeed + 30

  // bottom row: date is fixed, the countdown shrinks into the leftover
  // width and disappears entirely rather than clipping
  const metaSize = w < 100 ? 8 : narrow ? 9 : 11
  const shortDate = deadlineDate(conf.deadline)
  const dateW = shortDate.length * metaSize * 0.68
  // TBA tiles show the expected month of the announced next cycle where
  // the countdown would otherwise show stale negative days
  const countdown =
    status === 'TBA' && conf.nextCycleExpected
      ? formatExpectedMonth(conf.nextCycleExpected)
      : formatCountdown(days)
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
      // micro cluster cells snap into place with a short tween — hundreds
      // of long spring arcs read as chaotic flying; big tiles keep the
      // spring glide
      transition={micro ? { type: 'tween', duration: 0.18, ease: 'easeOut' } : SPRING}
      style={{
        padding: micro ? '2px 4px' : flat ? `0 ${padX}px` : narrow ? `9px ${padX}px` : `12px ${padX}px`,
        flexDirection: flat && !micro ? 'row' : 'column',
        alignItems: micro ? 'center' : flat ? 'center' : 'stretch',
        justifyContent: micro ? 'center' : 'space-between',
        gap: flat && !micro ? 12 : 0,
      }}
      onMouseEnter={micro ? () => onPeek(rect) : undefined}
      onMouseLeave={micro ? () => onPeek(null) : undefined}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-label={`${conf.name} ${conf.year}, deadline ${shortDate}`}
    >
      {micro ? (
        !labelless && (
          <div
            className="tile__name"
            style={{
              fontSize: Math.max(8, Math.min(11, h * 0.4, ((w - 8) * 1.3) / conf.name.length)),
            }}
          >
            {conf.name}
          </div>
        )
      ) : flat ? (
        <>
          <div
            className="tile__name"
            style={{ fontSize: Math.max(11, Math.min(h * 0.42, fittedName, 20)) }}
          >
            {conf.name}
            {showSup && <sup>({String(conf.year).slice(-2)})</sup>}
          </div>
          <div className="tile__meta" style={{ fontSize: 9, marginLeft: 'auto' }}>
            <span>{shortDate}</span>
          </div>
          {w > 230 && (
            <div className="tile__countdown" style={{ fontSize: Math.min(h * 0.4, 15) }}>
              {countdown}
            </div>
          )}
        </>
      ) : (
        <>
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

      <div style={{ minHeight: 0, overflow: 'hidden', flexGrow: showDetail ? 1 : 0 }}>
        {/* font-size transitions via CSS (see base.css) so text scales
            with the box instead of snapping to its final size */}
        <div className="tile__name" style={{ fontSize: nameSize }}>
          {conf.name}
          {showSup && <sup>({String(conf.year).slice(-2)})</sup>}
        </div>

        {showDetail && (
          <motion.dl
            className="tile__detail"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.28, ease: 'easeOut' }}
          >
            {showDetailFullName && (
              <>
                <dt>Full name</dt>
                <dd>{conf.fullName}</dd>
              </>
            )}
            <dt>Venue</dt>
            <dd>
              {conf.location} — {conf.year}
            </dd>
            {conf.abstractDeadline && (
              <>
                <dt>Abstract deadline</dt>
                <dd>{conf.abstractDeadline.replace('T', ' ')}</dd>
              </>
            )}
            <dt>Submission deadline</dt>
            <dd>
              {conf.deadline.replace('T', ' ')} {tzLabel(conf.tz)}
              <div style={{ opacity: 0.65 }}>
                Your time: {formatLocalCutoff(deadlineCutoffMs(conf.deadline, conf.tz))} ·{' '}
                {formatRemaining(deadlineCutoffMs(conf.deadline, conf.tz) - Date.now())}
              </div>
              {conf.deadlineNote && <div style={{ opacity: 0.65 }}>{conf.deadlineNote}</div>}
              {status === 'TBA' && conf.nextCycleExpected && (
                <div style={{ opacity: 0.65 }}>
                  Next cycle expected {formatExpectedMonth(conf.nextCycleExpected, true)} — date TBA
                </div>
              )}
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
            {showDetailTags && conf.tags && (
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
                  void share()
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
            {showDetailFreshness && <dd className="tile__freshness">DATA VERIFIED {conf.updatedAt}</dd>}
          </motion.dl>
        )}
      </div>

      {/* the detail block already states the deadline, so the bottom row
          yields its space to it while expanded (crossfading with the
          detail's entrance) */}
      <AnimatePresence initial={false}>
        {!showDetail && (
          <motion.div
            className="tile__row"
            style={{ alignItems: 'flex-end' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="tile__meta" style={{ fontSize: metaSize }}>
              <span>{shortDate}</span>
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
        </>
      )}
    </motion.div>
  )
}
