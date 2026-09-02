import { Link } from 'react-router-dom'
import type { ProfileBookmark } from '../api'
import { userProfilePath } from './Avatar'

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ProfileBookmarkBlurb({
  bookmark,
  showPrivateBadge,
}: {
  bookmark: ProfileBookmark
  showPrivateBadge?: boolean
}) {
  const { story } = bookmark
  const authorPath = userProfilePath(story.author)

  return (
    <li className="work-blurb bookmark-blurb">
      <Link to={`/story/${story.id}`} className="work-blurb-cover" style={{ background: story.coverColor }} aria-hidden />
      <div className="work-blurb-body">
        <div className="bookmark-blurb-head">
          <h3 className="work-blurb-title">
            <Link to={`/story/${story.id}`}>{story.title}</Link>
          </h3>
          {showPrivateBadge && !bookmark.isPublic && (
            <span className="bookmark-privacy-badge private">Private</span>
          )}
          {bookmark.isPublic && <span className="bookmark-privacy-badge public">Public</span>}
        </div>
        <p className="work-blurb-fandom">
          {story.genre}
          {' · '}
          {authorPath ? (
            <Link to={authorPath} className="author-link">{story.author.fullName}</Link>
          ) : (
            story.author.fullName
          )}
        </p>
        {bookmark.note && (
          <blockquote className="bookmark-note">
            <span className="bookmark-note-label">Bookmarker&apos;s notes</span>
            {bookmark.note}
          </blockquote>
        )}
        <p className="work-blurb-summary">{story.description}</p>
        <dl className="work-blurb-stats">
          <div>
            <dt>Chapters</dt>
            <dd>{story.chapterCount}</dd>
          </div>
          <div>
            <dt>Saved</dt>
            <dd>{formatWhen(bookmark.createdAt)}</dd>
          </div>
        </dl>
      </div>
    </li>
  )
}
