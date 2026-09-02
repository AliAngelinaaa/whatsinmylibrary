import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, apiErrorMessage, type ForumCategory } from '../api'
import CommunityHubLanding from '../components/CommunityHubLanding'
import ErrorAlert from '../components/ErrorAlert'
import { useAuth } from '../AuthContext'

export default function ForumPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [activeSlug, setActiveSlug] = useState('')
  const [threads, setThreads] = useState<Awaited<ReturnType<typeof api.forumThreads>>>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    api.forumCategories()
      .then((cats) => {
        setCategories(cats)
        if (cats.length > 0) setActiveSlug(cats[0].slug)
      })
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!user || !activeSlug) return
    api.forumThreads(activeSlug).then(setThreads)
  }, [activeSlug, user])

  const createThread = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setPosting(true)
    setError('')
    try {
      const thread = await api.createForumThread(activeSlug, title.trim(), body.trim())
      navigate(`/forum/thread/${thread.id}`)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to create thread'))
    } finally {
      setPosting(false)
    }
  }

  if (authLoading || (user && loading)) {
    return <div className="page-state">Loading forum…</div>
  }

  if (!user) {
    return (
      <div className="forum-page forum-page-guest">
        <CommunityHubLanding variant="full" />
      </div>
    )
  }

  return (
    <div className="forum-page">
      <section className="hero forum-hero">
        <p className="eyebrow">Community</p>
        <h1>Forum</h1>
        <p className="hero-copy">Recs, craft talk, fanfic chaos, and site feedback — all in one place.</p>
      </section>

      <div className="forum-layout">
        <aside className="forum-sidebar">
          <h3>Categories</h3>
          <ul className="forum-cat-list">
            {categories.map((cat) => (
              <li key={cat.slug}>
                <button
                  type="button"
                  className={`forum-cat-btn ${activeSlug === cat.slug ? 'active' : ''}`}
                  onClick={() => setActiveSlug(cat.slug)}
                >
                  <span>{cat.name}</span>
                  <span className="tab-count">{cat.threadCount}</span>
                </button>
                <p className="forum-cat-desc">{cat.description}</p>
              </li>
            ))}
          </ul>
        </aside>

        <main className="forum-main">
          <div className="forum-main-header">
            <h2>{categories.find((c) => c.slug === activeSlug)?.name || 'Threads'}</h2>
            <button className="btn primary" onClick={() => setShowNew(!showNew)}>
              {showNew ? 'Cancel' : 'New thread'}
            </button>
          </div>

          {showNew && (
            <div className="forum-new-thread">
              <input
                placeholder="Thread title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                rows={4}
                placeholder="What's on your mind?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <input type="text" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <button className="btn primary" onClick={createThread} disabled={posting || !title.trim() || !body.trim()}>
                {posting ? 'Creating…' : 'Post thread'}
              </button>
              {error && <ErrorAlert message={error} onClose={() => setError('')} />}
            </div>
          )}

          <ul className="forum-thread-list">
            {threads.length === 0 ? (
              <li className="muted">No threads yet — start one!</li>
            ) : (
              threads.map((t) => (
                <li key={t.id}>
                  <Link to={`/forum/thread/${t.id}`} className="forum-thread-card">
                    <h3>{t.title}</h3>
                    <p className="forum-thread-preview">{t.body}</p>
                    <div className="forum-thread-meta">
                      <span>{t.user.username || t.user.fullName}</span>
                      <span>{t.replyCount} repl{t.replyCount !== 1 ? 'ies' : 'y'}</span>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </main>
      </div>
    </div>
  )
}
