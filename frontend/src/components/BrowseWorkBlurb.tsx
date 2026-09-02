import { Link } from 'react-router-dom'
import type { StorySummary } from '../api'
import { MONETIZATION_ENABLED } from '../features'
import { userProfilePath } from './Avatar'

export type CollectionVariant = 'browse' | 'originals' | 'fanfics' | 'vip'

function formatDate(iso?: string) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function BrowseWorkBlurb({
  story,
  collectionPath = '/browse',
  variant = 'browse',
  featured = false,
}: {
  story: StorySummary
  collectionPath?: string
  variant?: CollectionVariant
  featured?: boolean
}) {
  const authorPath = userProfilePath(story.author)
  const posted = formatDate(story.createdAt)
  const author = authorPath ? (
    <Link to={authorPath}>{story.author.fullName}</Link>
  ) : (
    story.author.fullName
  )

  if (variant === 'originals') {
    return (
      <li className="shelf-card">
        <Link to={`/story/${story.id}`} className="shelf-card-cover" aria-hidden>
          <span style={{ background: story.coverColor }} />
        </Link>
        <h3 className="shelf-card-title">
          <Link to={`/story/${story.id}`}>{story.title}</Link>
        </h3>
        <p className="shelf-card-byline">by {author}</p>
        <p className="shelf-card-genre">
          <Link to={`${collectionPath}?genre=${encodeURIComponent(story.genre)}`}>{story.genre}</Link>
        </p>
        <p className="shelf-card-meta">
          <span>{story.chapterCount} {story.chapterCount === 1 ? 'ch' : 'chs'}</span>
          {story.wordCount != null && story.wordCount > 0 && (
            <span>{story.wordCount.toLocaleString()} words</span>
          )}
        </p>
      </li>
    )
  }

  if (variant === 'fanfics') {
    return (
      <li className="topic-card">
        {story.tags?.length > 0 && (
          <div className="topic-card-topics">
            {story.tags.map((tag) => (
              <Link key={tag.slug} to={`${collectionPath}?tags=${tag.slug}`}>
                {tag.name}
              </Link>
            ))}
          </div>
        )}
        <div className="topic-card-row">
          <Link to={`/story/${story.id}`} className="topic-card-cover" aria-hidden>
            <span style={{ background: story.coverColor }} />
          </Link>
          <div className="topic-card-body">
            <h3 className="topic-card-title">
              <Link to={`/story/${story.id}`}>{story.title}</Link>
            </h3>
            <p className="topic-card-byline">by {author}</p>
            <p className="topic-card-summary">{story.description}</p>
            <p className="topic-card-meta">
              {posted && <time>{posted}</time>}
              <span>{story.chapterCount} {story.chapterCount === 1 ? 'chapter' : 'chapters'}</span>
              {story.wordCount != null && story.wordCount > 0 && (
                <span>{story.wordCount.toLocaleString()} words</span>
              )}
            </p>
          </div>
        </div>
      </li>
    )
  }

  if (variant === 'vip') {
    return (
      <li className={`vip-card ${featured ? 'featured' : ''}`}>
        <Link to={`/story/${story.id}`} className="vip-card-cover" aria-hidden>
          <span style={{ background: story.coverColor }} />
          <em className="vip-card-badge">VIP</em>
        </Link>
        <div className="vip-card-body">
          <p className="vip-card-kicker">
            {story.freeChapters} free · {story.paidChapters} to unlock
          </p>
          <h3 className="vip-card-title">
            <Link to={`/story/${story.id}`}>{story.title}</Link>
          </h3>
          <p className="vip-card-byline">by {author}</p>
          {story.genre && (
            <p className="vip-card-genre">
              <Link to={`${collectionPath}?genre=${encodeURIComponent(story.genre)}`}>{story.genre}</Link>
            </p>
          )}
          <p className="vip-card-summary">{story.description}</p>
          <p className="vip-card-meta">
            <span>{story.chapterCount} {story.chapterCount === 1 ? 'chapter' : 'chapters'}</span>
            {story.wordCount != null && story.wordCount > 0 && (
              <span>{story.wordCount.toLocaleString()} words</span>
            )}
          </p>
        </div>
      </li>
    )
  }

  return (
    <li className="browse-blurb">
      <Link to={`/story/${story.id}`} className="browse-blurb-cover" aria-hidden>
        <span style={{ background: story.coverColor }} />
      </Link>

      <div className="browse-blurb-body">
        <div className="browse-blurb-top">
          <h3 className="browse-blurb-title">
            <Link to={`/story/${story.id}`}>{story.title}</Link>
          </h3>
          {posted && <time className="browse-blurb-date">{posted}</time>}
        </div>

        <p className="browse-blurb-byline">by {author}</p>

        <p className="browse-blurb-genre">
          <Link to={`${collectionPath}?genre=${encodeURIComponent(story.genre)}`}>{story.genre}</Link>
          {MONETIZATION_ENABLED && story.paidChapters > 0 && <span className="browse-blurb-vip">VIP</span>}
        </p>

        {story.tags?.length > 0 && (
          <div className="browse-blurb-tags">
            {story.tags.map((tag) => (
              <Link key={tag.slug} to={`${collectionPath}?tags=${tag.slug}`}>
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        <p className="browse-blurb-summary">{story.description}</p>

        <p className="browse-blurb-meta">
          <span>{story.chapterCount} {story.chapterCount === 1 ? 'chapter' : 'chapters'}</span>
          {story.wordCount != null && story.wordCount > 0 && (
            <span>{story.wordCount.toLocaleString()} words</span>
          )}
          {MONETIZATION_ENABLED && <span>{story.freeChapters} free</span>}
          {MONETIZATION_ENABLED && story.paidChapters > 0 && <span>{story.paidChapters} VIP</span>}
        </p>
      </div>
    </li>
  )
}
