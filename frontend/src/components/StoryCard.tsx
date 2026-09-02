import { Link } from 'react-router-dom'
import type { StorySummary } from '../api'
import { MONETIZATION_ENABLED } from '../features'
import { coverStyle } from '../utils/cover'
import { userProfilePath } from './Avatar'

export default function StoryCard({ story }: { story: StorySummary }) {
  const authorPath = userProfilePath(story.author)

  return (
    <article className="story-card">
      <Link to={`/story/${story.id}`} className="story-cover-link">
        <div className="story-cover" style={coverStyle(story)}>
          <span className="genre-tag">{story.genre}</span>
        </div>
      </Link>
      <div className="story-body">
        <Link to={`/story/${story.id}`} className="story-title-link">
          <h2>{story.title}</h2>
        </Link>
        <p className="story-author">
          by{' '}
          {authorPath ? (
            <Link to={authorPath} className="author-link">
              {story.author.fullName}
            </Link>
          ) : (
            story.author.fullName
          )}
        </p>
        <p className="story-desc">{story.description}</p>
        {story.tags?.length > 0 && (
          <div className="tag-row">
            {story.tags.slice(0, 4).map((tag) => (
              <span key={tag.slug} className="tag-chip small">{tag.name}</span>
            ))}
          </div>
        )}
        <div className="story-meta">
          <span>{story.chapterCount} chapters</span>
          {MONETIZATION_ENABLED && story.freeChapters > 0 && <span>{story.freeChapters} free</span>}
          {MONETIZATION_ENABLED && story.paidChapters > 0 && (
            <span className="vip-tag">{story.paidChapters} VIP</span>
          )}
        </div>
      </div>
    </article>
  )
}
