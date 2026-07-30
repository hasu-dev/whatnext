import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { newConferenceUrl } from '../lib/github'
import tagsVocab from '../../data/tags.json'

interface Props {
  fields: string[]
  onClose: () => void
}

// Collects the fields, assembles a valid JSON entry, and jumps to GitHub's
// prefilled new-file page so the contributor opens the PR themselves.
// No token, no proxy — the user's own GitHub session does the work.
export function AddConference({ fields, onClose }: Props) {
  const [form, setForm] = useState({
    id: '',
    name: '',
    fullName: '',
    year: new Date().getFullYear() + 1,
    field: fields[0] ?? 'AI',
    deadline: '',
    location: '',
    website: '',
    weight: 6,
  })
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

  const submit = () => {
    if (!/^[a-z0-9-]+$/.test(form.id)) return setError('id must be a lowercase slug (a-z, 0-9, -)')
    if (!/^[A-Z0-9/&+ -]{2,16}$/.test(form.name)) return setError('short name must be 2-16 uppercase chars')
    if (form.fullName.length < 8) return setError('full name looks too short')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.deadline)) return setError('deadline must be YYYY-MM-DD')
    if (form.website && !form.website.startsWith('https://')) return setError('website must start with https://')
    const entry: Record<string, unknown> = {
      id: form.id,
      name: form.name,
      fullName: form.fullName,
      year: Number(form.year),
      field: form.field,
      ...(tags.length > 0 ? { tags } : {}),
      deadline: form.deadline,
      location: form.location,
      ...(form.website ? { website: form.website } : {}),
      weight: Number(form.weight),
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
            ID (slug)
            <input value={form.id} onChange={(e) => set('id', e.target.value.toLowerCase())} placeholder="naacl" />
          </label>
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
            DEADLINE (YYYY-MM-DD)
            <input value={form.deadline} onChange={(e) => set('deadline', e.target.value)} placeholder="2026-12-15" />
          </label>
          <label>
            WEIGHT (1-25)
            <input type="number" min={1} max={25} value={form.weight} onChange={(e) => set('weight', e.target.value)} />
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
          <span className="modal__hint">Review the JSON on GitHub, then open the pull request. CI validates it.</span>
          <button className="modal__submit" onClick={submit}>
            CONTINUE ON GITHUB ↗
          </button>
        </div>
      </div>
    </div>
  )
}
