import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  api,
  type ForumThreadSummary,
  type Genre,
  type ReadingHistoryEntry,
  type StorySummary,
} from '../api'
import { useAuth } from '../AuthContext'
import { userProfilePath } from '../components/Avatar'
import GuestLanding from '../components/GuestLanding'
import StoryCard from '../components/StoryCard'

function storyScore(story: StorySummary) {
  return story.chapterCount * 2 + story.paidChapters * 3 + story.tags.length
}

function formatWhen(iso: string) {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function greetingName(user: { username?: string; fullName: string }) {
  if (user.username) return user.username
  return user.fullName.split(' ')[0] || user.fullName
}

function RankedStory({ story, rank }: { story: StorySummary; rank: number }) {
  return (
    <Link to={`/story/${story.id}`} className="home-ranked-item">
      <span className={`home-rank-badge rank-${rank}`}>{rank}</span>
      <span className="home-ranked-cover" style={{ background: story.coverColor }} />
      <span className="home-ranked-body">
        <span className="home-ranked-title">{story.title}</span>
        <span className="home-ranked-meta">
          {story.genre} · {story.author.fullName} · {story.chapterCount} ch.
        </span>
      </span>
    </Link>
  )
}

function ForumThreadRow({ thread }: { thread: ForumThreadSummary }) {
  return (
    <Link to={`/forum/thread/${thread.id}`} className="home-forum-row">
      <span className="home-forum-row-title">{thread.title}</span>
      <span className="home-forum-row-meta">
        <span>{thread.category.name}</span>
        <span>{thread.replyCount} repl{thread.replyCount !== 1 ? 'ies' : 'y'}</span>
        <span>{formatWhen(thread.updatedAt)}</span>
      </span>
    </Link>
  )
}

function ContinueReadingCard({ entry }: { entry: ReadingHistoryEntry }) {
  return (
    <Link to={`/story/${entry.storyId}/read/${entry.chapterNum}`} className="continue-card">
      <span className="continue-cover" style={{ background: entry.coverColor }} aria-hidden />
      <span className="continue-body">
        <span className="continue-title">{entry.storyTitle}</span>
        <span className="continue-meta">
          Ch. {entry.chapterNum}
          {entry.chapterTitle ? `: ${entry.chapterTitle}` : ''}
        </span>
        <span className="continue-when">{formatWhen(entry.updatedAt)}</span>
      </span>
    </Link>
  )
}

const QUICK_LINKS = [
  { to: '/browse', label: 'Browse all', desc: 'Genres & tags', icon: '📚', className: 'novels' },
  { to: '/fanfics', label: 'Fanfics', desc: 'AUs & ships', icon: '✨', className: 'fanfics' },
  { to: '/originals', label: 'Originals', desc: 'Writer-owned works', icon: '✍️', className: 'originals' },
  { to: '/forum', label: 'Community', desc: 'Forum & challenges', icon: '💬', className: 'forum' },
] as const

function MemberHome({
  user,
  genres,
  hotThreads,
  latestThreads,
  topStories,
  freshToday,
  recommended,
  newReleases,
  continueReading,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>
  genres: Genre[]
  hotThreads: ForumThreadSummary[]
  latestThreads: ForumThreadSummary[]
  topStories: StorySummary[]
  freshToday: StorySummary[]
  recommended: StorySummary[]
  newReleases: StorySummary[]
  continueReading: ReadingHistoryEntry[]
}) {
  const profilePath = userProfilePath(user)

  return (
    <div className="home-page member-home">
      <section className="member-welcome">
        <div className="member-welcome-copy">
          <p className="member-welcome-tag">Your library</p>
          <h1>Hi, {greetingName(user)}</h1>
          <p className="hero-copy">
            {user.favoriteGenres?.length
              ? `Fresh picks in ${user.favoriteGenres.join(', ')} — plus whatever you were reading last.`
              : 'Pick up where you left off or explore something new.'}
          </p>
        </div>
        <div className="member-welcome-actions">
          {profilePath && (
            <Link to={profilePath} className="btn secondary">
              View profile
            </Link>
          )}
          <Link to="/profile" className="btn ghost">
            Settings
          </Link>
        </div>
      </section>

      <div className="home-quick-nav member-quick-nav">
        {QUICK_LINKS.map(({ to, label, desc, icon, className }) => (
          <Link key={to} to={to} className={`home-quick-tile ${className}`}>
            <span className="home-quick-icon">{icon}</span>
            <span className="home-quick-label">{label}</span>
            <span className="home-quick-desc">{desc}</span>
          </Link>
        ))}
      </div>

      {continueReading.length > 0 && (
        <section className="home-section member-continue-section">
          <div className="home-section-header">
            <h2>Continue reading</h2>
            <Link to="/profile?tab=history" className="home-see-more">All history →</Link>
          </div>
          <div className="continue-scroll">
            {continueReading.slice(0, 8).map((entry) => (
              <ContinueReadingCard key={`${entry.storyId}-${entry.chapterNum}`} entry={entry} />
            ))}
          </div>
        </section>
      )}

      <section className="home-section">
        <div className="home-section-header">
          <h2>{user.favoriteGenres?.length ? 'Recommended for you' : 'Editor picks'}</h2>
          <Link to="/browse" className="home-see-more">Browse more →</Link>
        </div>
        <div className="story-grid home-story-grid">
          {recommended.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      </section>

      {genres.length > 0 && (
        <section className="home-section home-genre-strip">
          <div className="home-section-header">
            <h2>Browse by genre</h2>
            <Link to="/browse" className="home-see-more">See all →</Link>
          </div>
          <div className="home-genre-scroll">
            {genres.map((genre) => (
              <Link
                key={genre.slug}
                to={`/browse?genre=${encodeURIComponent(genre.name)}`}
                className="home-genre-pill"
              >
                {genre.name}
                <span className="tab-count">{genre.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(topStories.length > 0 || freshToday.length > 0) && (
        <section className="home-section home-charts">
          {topStories.length > 0 && (
            <div className="home-chart">
              <div className="home-section-header">
                <h2>
                  <span className="home-section-badge">TOP 5</span>
                  Most popular right now
                </h2>
                <Link to="/browse" className="home-see-more">See all →</Link>
              </div>
              <ol className="home-ranked-list">
                {topStories.map((story, i) => (
                  <li key={story.id}>
                    <RankedStory story={story} rank={i + 1} />
                  </li>
                ))}
              </ol>
            </div>
          )}
          {freshToday.length > 0 && (
            <div className="home-chart">
              <div className="home-section-header">
                <h2>
                  <span className="home-section-badge new">NEW</span>
                  New in the last day
                </h2>
                <Link to="/browse?sort=date" className="home-see-more">See all →</Link>
              </div>
              <ol className="home-ranked-list">
                {freshToday.map((story, i) => (
                  <li key={story.id}>
                    <RankedStory story={story} rank={i + 1} />
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      <section className="home-section">
        <div className="home-section-header">
          <h2>
            <span className="home-section-badge new">NEW</span>
            Latest releases
          </h2>
          <Link to="/browse" className="home-see-more">See all →</Link>
        </div>
        <div className="story-grid home-story-grid">
          {newReleases.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      </section>

      <section className="home-section home-forum-section">
        <div className="home-section-header">
          <h2>Community board</h2>
          <Link to="/forum" className="btn primary small-btn">Start a thread</Link>
        </div>
        <div className="home-forum-columns">
          <div className="home-forum-col">
            <h3 className="home-forum-col-title">🔥 Hot threads</h3>
            <div className="home-forum-list">
              {hotThreads.length === 0 ? (
                <p className="muted home-forum-empty">No threads yet.</p>
              ) : (
                hotThreads.map((thread) => <ForumThreadRow key={thread.id} thread={thread} />)
              )}
            </div>
          </div>
          <div className="home-forum-col">
            <h3 className="home-forum-col-title">🕐 Latest threads</h3>
            <div className="home-forum-list">
              {latestThreads.length === 0 ? (
                <p className="muted home-forum-empty">No threads yet.</p>
              ) : (
                latestThreads.map((thread) => <ForumThreadRow key={thread.id} thread={thread} />)
              )}
            </div>
          </div>
        </div>
        <div className="section-footer">
          <Link to="/forum" className="btn secondary">Visit the forum →</Link>
        </div>
      </section>
    </div>
  )
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const isGuest = !user
  const [stories, setStories] = useState<StorySummary[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [hotThreads, setHotThreads] = useState<ForumThreadSummary[]>([])
  const [latestThreads, setLatestThreads] = useState<ForumThreadSummary[]>([])
  const [continueReading, setContinueReading] = useState<ReadingHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetches: [
      Promise<StorySummary[]>,
      Promise<Genre[]>,
      ...Array<Promise<ForumThreadSummary[]>>,
    ] = [
      api.stories(),
      api.genres(),
    ]

    if (user) {
      fetches.push(api.forumFeed('hot', 10), api.forumFeed('latest', 10))
    }

    Promise.all(fetches)
      .then((results) => {
        const [allStories, allGenres] = results as [StorySummary[], Genre[], ...ForumThreadSummary[][]]
        setStories(allStories)
        setGenres(allGenres)
        if (user && results.length > 2) {
          setHotThreads(results[2] as ForumThreadSummary[])
          setLatestThreads(results[3] as ForumThreadSummary[])
        } else {
          setHotThreads([])
          setLatestThreads([])
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!user) {
      setContinueReading([])
      return
    }
    api.userHistory()
      .then((history) => setContinueReading(history.reading))
      .catch(() => setContinueReading([]))
  }, [user])

  const topStories = useMemo(
    () => [...stories].sort((a, b) => storyScore(b) - storyScore(a)).slice(0, 5),
    [stories],
  )

  const freshToday = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    const postedToday = stories.filter((story) => {
      if (!story.createdAt) return false
      return new Date(story.createdAt).getTime() >= dayAgo
    })
    const pool = postedToday.length > 0 ? postedToday : stories
    return [...pool]
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bTime - aTime
      })
      .slice(0, 5)
  }, [stories])

  const recommended = useMemo(() => {
    if (user?.favoriteGenres?.length) {
      const preferred = stories.filter((s) => user.favoriteGenres.includes(s.genre))
      if (preferred.length > 0) return preferred.slice(0, 4)
    }
    return stories.slice(0, 4)
  }, [stories, user])

  const trending = useMemo(
    () => [...stories].sort((a, b) => storyScore(b) - storyScore(a)).slice(0, 16),
    [stories],
  )
  const fanfics = useMemo(
    () => stories.filter((s) => s.genre === 'Fanfiction').slice(0, 16),
    [stories],
  )
  const originals = useMemo(
    () => stories.filter((s) => s.genre !== 'Fanfiction').slice(0, 12),
    [stories],
  )
  const newReleases = useMemo(() => stories.slice(0, 6), [stories])

  if (authLoading || loading) return <div className="page-state">Loading home…</div>
  if (error) return <div className="page-state error">Could not load home. Is the backend running?</div>

  if (isGuest) {
    return (
      <GuestLanding
        genres={genres}
        trending={trending}
        fanfics={fanfics}
        originals={originals}
      />
    )
  }

  return (
    <MemberHome
      user={user}
      genres={genres}
      hotThreads={hotThreads}
      latestThreads={latestThreads}
      topStories={topStories}
      freshToday={freshToday}
      recommended={recommended}
      newReleases={newReleases}
      continueReading={continueReading}
    />
  )
}
