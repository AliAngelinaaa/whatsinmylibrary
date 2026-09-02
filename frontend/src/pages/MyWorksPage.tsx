import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, apiErrorMessage, type MyStorySummary } from '../api'

export default function MyWorksPage() {
  const navigate = useNavigate()
  const [works, setWorks] = useState<MyStorySummary[] | null>(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = () => {
    api
      .myStories()
      .then(setWorks)
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load your works')))
  }

  useEffect(load, [])

  const handleCreate = async () => {
    setCreating(true)
    setError('')
    try {
      const { id } = await api.createStory()
      navigate(`/write/${id}`)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to create work'))
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Delete "${title}"? This removes all its chapters too.`)) return
    setBusyId(id)
    try {
      await api.deleteStory(id)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to delete work'))
    } finally {
      setBusyId(null)
    }
  }

  if (!works) return <div className="page-state">Loading your works…</div>

  return (
    <div className="my-works-page">
      <div className="my-works-header">
        <div>
          <h1>My works</h1>
          <p className="muted">Draft, edit, and publish your stories.</p>
        </div>
        <button type="button" className="btn primary" onClick={handleCreate} disabled={creating}>
          {creating ? 'Creating…' : '+ Post new work'}
        </button>
      </div>

      {error && <div className="inline-error">{error}</div>}

      {works.length === 0 ? (
        <div className="my-works-empty">
          <p>You haven&apos;t started a work yet.</p>
          <button type="button" className="btn primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Start your first work'}
          </button>
        </div>
      ) : (
        <div className="my-works-list">
          {works.map((work) => (
            <article key={work.id} className="my-works-row">
              <div
                className="my-works-cover"
                style={
                  work.coverImageUrl
                    ? { backgroundImage: `url(${work.coverImageUrl})` }
                    : { background: work.coverColor }
                }
                aria-hidden
              />
              <div className="my-works-body">
                <div className="my-works-title-row">
                  <h2>
                    {work.status === 'published' ? (
                      <Link to={`/story/${work.id}`}>{work.title}</Link>
                    ) : (
                      work.title
                    )}
                  </h2>
                  <span className={`status-pill ${work.status}`}>
                    {work.status === 'published' ? (work.complete ? 'Complete' : 'In Progress') : 'Draft'}
                  </span>
                </div>
                <p className="muted my-works-meta">
                  {work.genre || 'No shelf yet'} · {work.totalChapters}{' '}
                  {work.totalChapters === 1 ? 'chapter' : 'chapters'}
                  {work.draftChapters > 0 && ` (${work.draftChapters} unpublished)`}
                </p>
                <div className="my-works-actions">
                  <Link to={`/write/${work.id}`} className="btn secondary">
                    Edit details
                  </Link>
                  <Link to={`/write/${work.id}/chapters/new`} className="btn secondary">
                    + Add chapter
                  </Link>
                  <button
                    type="button"
                    className="btn ghost danger"
                    disabled={busyId === work.id}
                    onClick={() => handleDelete(work.id, work.title)}
                  >
                    {busyId === work.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
