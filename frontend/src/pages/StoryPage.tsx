import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type StoryDetail } from '../api'
import { useAuth } from '../AuthContext'
import { userProfilePath } from '../components/Avatar'
import TipAuthor from '../components/TipAuthor'
import StoryBookmark from '../components/StoryBookmark'
import StoryComments from '../components/StoryComments'
import StoryMetaBadges from '../components/StoryMetaBadges'
import { MONETIZATION_ENABLED } from '../features'
import { useCopyProtection } from '../hooks/useCopyProtection'

export default function StoryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const storyHeroRef = useRef<HTMLDivElement>(null)
  const [story, setStory] = useState<StoryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [unlocking, setUnlocking] = useState<number | null>(null)
  const [error, setError] = useState('')

  const storyId = Number(id)

  const [bookmarkState, setBookmarkState] = useState({
    bookmarked: false,
    bookmarkPublic: false,
    bookmarkNote: '',
  })

  const loadStory = () => {
    setLoading(true)
    api.story(storyId)
      .then((s) => {
        setStory(s)
        setBookmarkState({
          bookmarked: s.bookmarked,
          bookmarkPublic: s.bookmarkPublic,
          bookmarkNote: s.bookmarkNote,
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(loadStory, [storyId])

  useCopyProtection(storyHeroRef, !!story)

  const handleUnlock = async (chapterId: number, chapterNum: number) => {
    if (!user) {
      navigate('/login')
      return
    }
    setUnlocking(chapterId)
    setError('')
    try {
      await api.unlockChapter(chapterId)
      await refreshUser()
      loadStory()
      navigate(`/story/${storyId}/read/${chapterNum}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unlock failed')
    } finally {
      setUnlocking(null)
    }
  }

  if (loading) return <div className="page-state">Loading…</div>
  if (!story) return <div className="page-state error">{error || 'Story not found'}</div>

  const heroBackground = story.coverImageUrl
    ? `linear-gradient(180deg, rgba(26,21,16,0.15), rgba(26,21,16,0.55)), url(${story.coverImageUrl})`
    : `linear-gradient(160deg, ${story.coverColor}, color-mix(in srgb, ${story.coverColor} 70%, #1a1510))`

  const publishedChapterCount = story.chapters.filter((c) => c.published !== false).length

  return (
    <div className="story-page">
      <div
        className={`story-hero ${story.coverImageUrl ? 'has-cover-image' : ''}`}
        style={{ background: heroBackground, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="story-hero-inner protected-content" ref={storyHeroRef}>
          <Link to={`/browse?genre=${encodeURIComponent(story.genre)}`} className="genre-tag linkish">
            {story.genre}
          </Link>
          <h1>{story.title}</h1>
          <p className="story-author">
            by{' '}
            {userProfilePath(story.author) ? (
              <Link to={userProfilePath(story.author)!} className="author-link">
                {story.author.fullName}
              </Link>
            ) : (
              story.author.fullName
            )}
            {story.coAuthors && story.coAuthors.length > 0 && (
              <>
                {' & '}
                {story.coAuthors.map((co, i) => (
                  <span key={co.id}>
                    {i > 0 && ', '}
                    {userProfilePath(co) ? <Link to={userProfilePath(co)!} className="author-link">{co.fullName}</Link> : co.fullName}
                  </span>
                ))}
              </>
            )}
          </p>
          <StoryMetaBadges
            rating={story.rating}
            warnings={story.warnings}
            categories={story.categories}
            complete={story.complete}
            language={story.language}
          />
          <p className="story-desc">{story.description}</p>
          {story.tags?.length > 0 && (
            <div className="tag-row hero-tags">
              {story.tags.map((tag) => (
                <Link
                  key={tag.slug}
                  to={`/browse?tags=${tag.slug}`}
                  className="tag-chip small linkish"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}
          {story.isOwner && (
            <Link to={`/write/${story.id}`} className="btn secondary manage-work-btn">
              Manage this work
            </Link>
          )}
        </div>
      </div>

      {error && <div className="inline-error">{error}</div>}

      <div className="story-page-grid">
        <section className="chapter-list">
          <h2>
            Chapters{' '}
            <span className="chapter-count-hint">
              {publishedChapterCount}/{story.complete ? publishedChapterCount : '?'}
            </span>
          </h2>
          {story.chapters.map((ch) => (
            <div key={ch.id} className={`chapter-row ${ch.locked ? 'locked' : ''}`}>
              <div>
                <p className="chapter-num">Chapter {ch.number}</p>
                <p className="chapter-title">
                  {ch.title}
                  {ch.published === false && <span className="status-pill small draft">Draft</span>}
                </p>
              </div>
              <div className="chapter-actions">
                {ch.locked ? (
                  MONETIZATION_ENABLED ? (
                    <>
                      <span className="coin-price">◎ {ch.coinCost}</span>
                      <button
                        className="btn primary"
                        disabled={unlocking === ch.id}
                        onClick={() => handleUnlock(ch.id, ch.number)}
                      >
                        {unlocking === ch.id ? 'Unlocking…' : 'Unlock'}
                      </button>
                    </>
                  ) : (
                    <span className="muted chapter-unavailable">Coming soon</span>
                  )
                ) : !user ? (
                  <Link to={`/story/${story.id}/read/${ch.number}`} className="btn secondary">
                    Sign in to read
                  </Link>
                ) : (
                  <Link to={`/story/${story.id}/read/${ch.number}`} className="btn secondary">
                    Read
                  </Link>
                )}
              </div>
            </div>
          ))}
        </section>

        <aside className="story-sidebar">
          <StoryBookmark
            storyId={story.id}
            bookmarked={bookmarkState.bookmarked}
            bookmarkPublic={bookmarkState.bookmarkPublic}
            bookmarkNote={bookmarkState.bookmarkNote}
            onChange={setBookmarkState}
          />
          {MONETIZATION_ENABLED && (
            <TipAuthor
              storyId={story.id}
              authorName={story.author.fullName}
              tipsEnabled={story.tipsEnabled}
              tipTotal={story.tipTotal}
              tipCount={story.tipCount}
              onTipped={loadStory}
            />
          )}
        </aside>
      </div>

      <StoryComments storyId={story.id} />
    </div>
  )
}
