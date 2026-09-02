import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, apiErrorMessage, type ChapterDetail } from '../api'
import RichTextEditor from '../components/RichTextEditor'

function wordCount(html: string) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.length
}

export default function ChapterEditPage() {
  const { storyId, chapterId } = useParams()
  const navigate = useNavigate()
  const creatingRef = useRef(false)

  const [chapter, setChapter] = useState<ChapterDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(false)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [notes, setNotes] = useState('')
  const [endNotes, setEndNotes] = useState('')
  const [content, setContent] = useState('')

  const isNew = chapterId === 'new'
  const numericStoryId = Number(storyId)

  useEffect(() => {
    if (!isNew) return
    if (creatingRef.current) return
    creatingRef.current = true
    api
      .createChapter(numericStoryId)
      .then(({ id }) => navigate(`/write/${storyId}/chapters/${id}`, { replace: true }))
      .catch((err) => setError(apiErrorMessage(err, 'Failed to create chapter')))
  }, [isNew, numericStoryId, storyId, navigate])

  const numericChapterId = Number(chapterId)

  const load = () => {
    if (isNew || !chapterId || Number.isNaN(numericChapterId)) return
    setLoading(true)
    api
      .chapterForEdit(numericChapterId)
      .then((c) => {
        setChapter(c)
        setTitle(c.title)
        setSummary(c.summary || '')
        setNotes(c.notes || '')
        setEndNotes(c.endNotes || '')
        setContent(c.content || '')
      })
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load chapter')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [chapterId])

  const save = async (publish?: boolean) => {
    if (!chapter) return
    setSaving(publish === undefined ? 'draft' : publish ? 'publish' : 'draft')
    setError('')
    setMessage('')
    try {
      const payload: Record<string, unknown> = { title, summary, notes, endNotes, content }
      if (publish !== undefined) payload.published = publish
      await api.updateChapter(chapter.id, payload)
      setMessage(publish ? 'Chapter posted!' : publish === false ? 'Chapter unpublished.' : 'Draft saved.')
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save chapter'))
    } finally {
      setSaving(null)
    }
  }

  if (isNew || loading) return <div className="page-state">{isNew ? 'Creating chapter…' : 'Loading chapter…'}</div>
  if (!chapter) return <div className="page-state error">{error || 'Chapter not found'}</div>

  return (
    <div className="chapter-edit-page">
      <div className="story-edit-header">
        <div>
          <Link to={`/write/${storyId}`} className="btn ghost small-btn">
            ← Back to work
          </Link>
          <h1>
            Ch. {chapter.number}: {title || 'Untitled chapter'}
          </h1>
          <span className={`status-pill ${chapter.publishedAt ? 'published' : 'draft'}`}>
            {chapter.publishedAt ? 'Posted' : 'Draft'}
          </span>
        </div>
        <div className="story-edit-header-actions">
          <button type="button" className="btn ghost" onClick={() => setPreview((p) => !p)}>
            {preview ? 'Back to editing' : 'Preview'}
          </button>
          <button type="button" className="btn secondary" disabled={saving !== null} onClick={() => save()}>
            {saving === 'draft' ? 'Saving…' : 'Save draft'}
          </button>
          {chapter.publishedAt ? (
            <button type="button" className="btn ghost" disabled={saving !== null} onClick={() => save(false)}>
              Unpublish
            </button>
          ) : (
            <button type="button" className="btn primary" disabled={saving !== null} onClick={() => save(true)}>
              {saving === 'publish' ? 'Posting…' : 'Post chapter'}
            </button>
          )}
        </div>
      </div>

      {message && <div className="inline-notice">{message}</div>}
      {error && <div className="inline-error">{error}</div>}

      {preview ? (
        <article className="chapter-preview wattpad-reader">
          <h1>{title}</h1>
          {summary && <p className="chapter-note-block chapter-summary">{summary}</p>}
          {notes && <p className="chapter-note-block chapter-notes">{notes}</p>}
          <div dangerouslySetInnerHTML={{ __html: content }} />
          {endNotes && <p className="chapter-note-block chapter-end-notes">{endNotes}</p>}
        </article>
      ) : (
        <div className="profile-panel chapter-edit-grid">
          <section className="profile-card">
            <label>
              Chapter title
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled chapter" />
            </label>
            <label>
              Summary <span className="field-hint-inline">(optional)</span>
              <textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="A short teaser for this chapter…" />
            </label>
            <label>
              Beginning notes <span className="field-hint-inline">(optional)</span>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Author's note shown before the chapter…" />
            </label>
          </section>

          <section className="profile-card chapter-edit-body">
            <div className="profile-card-head">
              <h2>Chapter text</h2>
              <span className="field-hint">{wordCount(content).toLocaleString()} words</span>
            </div>
            <RichTextEditor value={content} onChange={setContent} placeholder="Start writing…" />
          </section>

          <section className="profile-card">
            <label>
              End notes <span className="field-hint-inline">(optional)</span>
              <textarea rows={2} value={endNotes} onChange={(e) => setEndNotes(e.target.value)} placeholder="Author's note shown after the chapter…" />
            </label>
          </section>
        </div>
      )}
    </div>
  )
}
