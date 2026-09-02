import { Link } from 'react-router-dom'
import type { ProfileWork } from '../api'
import { MONETIZATION_ENABLED } from '../features'

function formatUpdated(iso: string) {
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ProfileWorkBlurb({ work }: { work: ProfileWork }) {
  return (
    <li className="work-blurb">
      <div className="work-blurb-cover" style={{ background: work.coverColor }} aria-hidden />
      <div className="work-blurb-body">
        <h3 className="work-blurb-title">
          <Link to={`/story/${work.id}`}>{work.title}</Link>
        </h3>
        <p className="work-blurb-fandom">
          <Link to={`/browse?genre=${encodeURIComponent(work.genre)}`}>{work.genre}</Link>
        </p>
        {work.tags?.length > 0 && (
          <div className="work-blurb-tags tag-row">
            {work.tags.map((tag) => (
              <Link key={tag.slug} to={`/browse?tags=${tag.slug}`} className="tag-chip small linkish">
                {tag.name}
              </Link>
            ))}
          </div>
        )}
        <p className="work-blurb-summary">{work.description}</p>
        <dl className="work-blurb-stats">
          <div>
            <dt>Chapters</dt>
            <dd>{work.chapterCount}</dd>
          </div>
          {MONETIZATION_ENABLED && (
            <>
              <div>
                <dt>Free</dt>
                <dd>{work.freeChapters}</dd>
              </div>
              {work.paidChapters > 0 && (
                <div>
                  <dt>VIP</dt>
                  <dd>{work.paidChapters}</dd>
                </div>
              )}
            </>
          )}
          <div>
            <dt>Updated</dt>
            <dd>{formatUpdated(work.createdAt)}</dd>
          </div>
        </dl>
      </div>
    </li>
  )
}
