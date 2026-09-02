import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, type PublicProfile } from '../api'
import { useAuth } from '../AuthContext'
import Avatar from '../components/Avatar'
import ProfileBookmarkTile from '../components/ProfileBookmarkTile'
import ProfilePostTile from '../components/ProfilePostTile'

type BoardFilter = 'all' | 'writes' | 'reads'

function bannerGradient(color: string) {
  return `linear-gradient(160deg, color-mix(in srgb, ${color} 70%, #1a1520), color-mix(in srgb, ${color} 45%, #2d2438))`
}

function hashTag(value: string) {
  return `#${value.toLowerCase().replace(/\s+/g, '')}`
}

export default function PublicProfilePage() {
  const { username } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const filter = (searchParams.get('board') as BoardFilter) || 'all'

  useEffect(() => {
    if (!username) return
    setLoading(true)
    setError('')
    api.publicUser(username)
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : 'User not found'))
      .finally(() => setLoading(false))
  }, [username, currentUser?.id])

  const mixedPins = useMemo(() => {
    if (!profile) return []
    const writes = profile.stories.map((story) => ({ kind: 'write' as const, story, at: story.createdAt }))
    const reads = profile.bookmarks.map((bookmark) => ({ kind: 'read' as const, bookmark, at: bookmark.createdAt }))
    const merged = [...writes, ...reads].sort((a, b) => {
      const aTime = a.at ? new Date(a.at).getTime() : 0
      const bTime = b.at ? new Date(b.at).getTime() : 0
      return bTime - aTime
    })
    if (filter === 'writes') return merged.filter((pin) => pin.kind === 'write')
    if (filter === 'reads') return merged.filter((pin) => pin.kind === 'read')
    return merged
  }, [profile, filter])

  if (loading) return <div className="page-state">Loading profile…</div>
  if (error || !profile) {
    return (
      <div className="page-state error">
        <p>{error || 'User not found'}</p>
        <Link to="/browse" className="btn secondary">Browse stories</Link>
      </div>
    )
  }

  const { user, storyCount, totalChapters, genres, bookmarkCount = 0, bookmarks = [], isOwnProfile } = profile

  const setFilter = (board: BoardFilter) => {
    const next = new URLSearchParams()
    if (board !== 'all') next.set('board', board)
    setSearchParams(next, { replace: true })
  }

  const bannerStyle = user.bannerUrl
    ? {
        backgroundImage: `url(${user.bannerUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { background: bannerGradient(user.avatarColor) }

  const emptyBoard = mixedPins.length === 0 && filter !== 'all'

  return (
    <div className="pin-profile" style={{ '--pin-accent': user.avatarColor || '#957DAD' } as React.CSSProperties}>
      <header className="pin-identity">
        <div className="pin-identity-banner" style={bannerStyle} />
        {isOwnProfile && (
          <Link to="/profile" className="pin-edit">
            Customize
          </Link>
        )}
        <div className="pin-identity-row">
          <Avatar user={user} size="xl" className="pin-avatar" />
          <div className="pin-identity-copy">
            <h1>{user.username || user.fullName}</h1>
            {user.fullName && user.username && user.fullName !== user.username && (
              <p className="pin-realname">{user.fullName}</p>
            )}
            <p className="pin-counts">
              {storyCount} written
              {' · '}
              {bookmarkCount} saved
              {' · '}
              {totalChapters} {totalChapters === 1 ? 'chapter' : 'chapters'}
            </p>
          </div>
        </div>
      </header>

      <div className="pin-filters" role="tablist" aria-label="Profile board">
        <button type="button" role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          All
        </button>
        <button type="button" role="tab" aria-selected={filter === 'writes'} className={filter === 'writes' ? 'active' : ''} onClick={() => setFilter('writes')}>
          Writes
        </button>
        <button type="button" role="tab" aria-selected={filter === 'reads'} className={filter === 'reads' ? 'active' : ''} onClick={() => setFilter('reads')}>
          Reads
        </button>
      </div>

      {emptyBoard ? (
        <div className="pin-empty">
          <p>{filter === 'writes' ? 'No stories published yet.' : 'No public saves to show.'}</p>
        </div>
      ) : (
        <div className="pin-board">
          {filter === 'all' && (
            <article className="pin-card pin-about">
              <p className="pin-kicker">About</p>
              {user.bio ? (
                <p className="pin-bio">{user.bio}</p>
              ) : (
                <p className="pin-bio muted">No bio yet — just the books.</p>
              )}
            </article>
          )}

          {filter === 'all' && (
            <article className="pin-card pin-stat">
              <p className="pin-kicker">Library</p>
              <p className="pin-stat-line"><strong>{storyCount}</strong> written</p>
              <p className="pin-stat-line"><strong>{bookmarkCount}</strong> saved</p>
              <p className="pin-stat-line"><strong>{totalChapters}</strong> chapters</p>
            </article>
          )}

          {filter === 'all' && user.favoriteGenres && user.favoriteGenres.length > 0 && (
            <article className="pin-card pin-chips">
              <p className="pin-kicker">Into</p>
              <div className="pin-tags">
                {user.favoriteGenres.map((genre) => (
                  <span key={genre}>{hashTag(genre)}</span>
                ))}
              </div>
            </article>
          )}

          {filter === 'all' && genres.length > 0 && (
            <article className="pin-card pin-chips">
              <p className="pin-kicker">Writes</p>
              <div className="pin-tags">
                {genres.map((genre) => (
                  <Link key={genre} to={`/browse?genre=${encodeURIComponent(genre)}`}>
                    {hashTag(genre)}
                  </Link>
                ))}
              </div>
            </article>
          )}

          {mixedPins.map((pin) =>
            pin.kind === 'write' ? (
              <ProfilePostTile key={`w-${pin.story.id}`} work={pin.story} />
            ) : (
              <ProfileBookmarkTile
                key={`r-${pin.bookmark.id}`}
                bookmark={pin.bookmark}
                showPrivateBadge={isOwnProfile}
              />
            ),
          )}

          {filter === 'all' && storyCount === 0 && bookmarks.length === 0 && (
            <article className="pin-card pin-empty-card">
              <p>This board is still empty.</p>
              {isOwnProfile && (
                <p className="field-hint">Publish a story or save one with a public bookmark and it will land here.</p>
              )}
            </article>
          )}
        </div>
      )}
    </div>
  )
}
