import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { newConferenceUrl } from '../lib/github'
import tagsVocab from '../../data/tags.json'

interface Props {
  fields: string[]
  onClose: () => void
}

// Contributors pick a tier, not a magic number. The mapped weight is only
// the cold-start prior for tile size — once the entry is live, aggregated
// attention signals take over and drive the area; maintainers can still
// tune the number in review.
const TIERS = [
  { label: 'Flagship', weight: 20, hint: 'the venue a whole field plans around' },
  { label: 'Major', weight: 12, hint: 'top venue in its area' },
  { label: 'Specialized', weight: 7, hint: 'strong focused venue' },
  { label: 'Niche', weight: 3, hint: 'workshop / regional' },
]

// Collects the fields, assembles a valid JSON entry, and jumps to GitHub's
// prefilled new-file page so the contributor opens the PR themselves.
// No token, no proxy — the user's own GitHub session does the work.
export function AddConference({ fields, onClose }: Props) {
  const [form, setForm] = useState({
    name: '',
    fullName: '',
    year: new Date().getFullYear() + 1,
    field: fields[0] ?? 'AI',
    deadline: '',
    location: '',
    website: '',
  })
  const [tier, setTier] = useState(2) // default: Specialized
  const [tags, setTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }))

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.length < 8 ? [...prev, t] : prev))

  // stable per-edition id: <confname>-<year>, derived so it can't drift
  // from the filename convention
  const derivedId = `${form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${form.year}`

  const submit = () => {
    if (!/^[A-Z0-9/&+ -]{2,16}$/.test(form.name)) return setError('short name must be 2-16 uppercase chars')
    if (form.fullName.length < 8) return setError('full name looks too short')
    if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/.test(form.deadline))
      return setError('deadline must be YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS')
    if (form.website && !form.website.startsWith('https://')) return setError('website must start with https://')
    const entry: Record<string, unknown> = {
      id: derivedId,
      name: form.name,
      fullName: form.fullName,
      year: Number(form.year),
      field: form.field,
      ...(tags.length > 0 ? { tags } : {}),
      // date-only input normalizes to end of day; explicit times pass through
      deadline: form.deadline.includes('T') ? form.deadline : `${form.deadline}T23:59:59`,
      location: form.location,
      ...(form.website ? { website: form.website } : {}),
      weight: TIERS[tier].weight,
      featured: false,
      updatedAt: new Date().toISOString().slice(0, 10),
    }
    window.open(newConferenceUrl(entry), '_blank', 'noopener')
    onClose()
  }

  return (
    <div className="modal" onClick={onClose} role="dialog" aria-label="Add a conference">
      <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <span>ADD A CONFERENCE — OPENS A GITHUB PR</span>
          <button onClick={onClose} aria-label="Close">
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>

        <div className="modal__grid">
          <label>
            SHORT NAME
            <input value={form.name} onChange={(e) => set('name', e.target.value.toUpperCase())} placeholder="NAACL" />
          </label>
          <label className="modal__wide">
            FULL NAME
            <input
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="North American Chapter of the ACL"
            />
          </label>
          <label>
            YEAR
            <input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} />
          </label>
          <label>
            FIELD
            <input
              list="add-conf-fields"
              value={form.field}
              onChange={(e) => set('field', e.target.value.toUpperCase())}
            />
            <datalist id="add-conf-fields">
              {fields.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>
          <label>
            DEADLINE (DATE OR DATE+TIME)
            <input
              value={form.deadline}
              onChange={(e) => set('deadline', e.target.value)}
              placeholder="2026-12-15 or 2026-12-15T22:00:00"
            />
          </label>
          <label>
            LOCATION
            <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="City, Country" />
          </label>
          <label>
            WEBSITE
            <input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" />
          </label>
        </div>

        <div className="modal__tags">
          <span className="modal__label">PROMINENCE — INITIAL TILE SIZE ONLY; LIVE ATTENTION TAKES OVER</span>
          <div>
            {TIERS.map((t, i) => (
              <button
                key={t.label}
                className={`chip ${tier === i ? 'is-active' : ''}`}
                onClick={() => setTier(i)}
                title={t.hint}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="modal__tags">
          <span className="modal__label">TAGS (MAX 8, CONTROLLED VOCABULARY)</span>
          <div>
            {tagsVocab.tags.map((t) => (
              <button key={t} className={`chip ${tags.includes(t) ? 'is-active' : ''}`} onClick={() => toggleTag(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="modal__error">{error}</div>}

        <div className="modal__foot">
          <span className="modal__hint">
            {form.name ? `File: data/conferences/${derivedId}.json — ` : ''}
            Review the JSON on GitHub, then open the pull request. CI validates it.
          </span>
          <button className="modal__submit" onClick={submit}>
            CONTINUE ON GITHUB ↗
          </button>
        </div>
      </div>
    </div>
  )
}
