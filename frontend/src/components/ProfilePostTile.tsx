import { Link } from 'react-router-dom'
import type { ProfileWork } from '../api'
import { MONETIZATION_ENABLED } from '../features'

const COVER_SIZES = ['short', 'mid', 'tall'] as const

export default function ProfilePostTile({
  work,
  size,
}: {
  work: ProfileWork
  size?: (typeof COVER_SIZES)[number]
}) {
  const cover = size || COVER_SIZES[work.id % 3]

  return (
    <article className={`pin-card pin-write pin-cover-${cover}`}>
      <Link to={`/story/${work.id}`} className="pin-card-link">
        <div className="pin-cover" style={{ background: work.coverColor }}>
          <span className="pin-kicker">Wrote</span>
          <span className="pin-genre">{work.genre}</span>
        </div>
        <div className="pin-body">
          <h3>{work.title}</h3>
          <p className="pin-excerpt">{work.description}</p>
          {work.tags?.length > 0 && (
            <div className="pin-tags">
              {work.tags.slice(0, 3).map((tag) => (
                <span key={tag.slug}>#{tag.slug}</span>
              ))}
            </div>
          )}
          <p className="pin-meta">
            {work.chapterCount} {work.chapterCount === 1 ? 'chapter' : 'chapters'}
            {MONETIZATION_ENABLED && work.paidChapters > 0 ? ` · ${work.paidChapters} VIP` : ''}
          </p>
        </div>
      </Link>
    </article>
  )
}
