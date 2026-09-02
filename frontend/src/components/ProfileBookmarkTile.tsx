import { Link } from 'react-router-dom'
import type { ProfileBookmark } from '../api'
import { userProfilePath } from './Avatar'

export default function ProfileBookmarkTile({
  bookmark,
  showPrivateBadge,
}: {
  bookmark: ProfileBookmark
  showPrivateBadge?: boolean
}) {
  const { story } = bookmark
  const authorPath = userProfilePath(story.author)

  return (
    <article className="pin-card pin-read">
      <Link to={`/story/${story.id}`} className="pin-card-link">
        <div className="pin-cover pin-cover-short" style={{ background: story.coverColor }}>
          <span className="pin-kicker">Reading</span>
          {showPrivateBadge && !bookmark.isPublic && (
            <span className="pin-badge private">Private</span>
          )}
          {bookmark.isPublic && <span className="pin-badge liked">♥</span>}
        </div>
        <div className="pin-body">
          <h3>{story.title}</h3>
          {bookmark.note && <p className="pin-note">“{bookmark.note}”</p>}
        </div>
      </Link>
      <p className="pin-meta pin-meta-pad">
        {story.genre}
        {' · '}
        {authorPath ? (
          <Link to={authorPath} className="pin-author">
            {story.author.fullName}
          </Link>
        ) : (
          story.author.fullName
        )}
      </p>
    </article>
  )
}
