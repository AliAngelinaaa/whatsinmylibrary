import { CATEGORY_LABELS, RATING_LABELS, type StoryCategory, type StoryRating } from '../api'

export default function StoryMetaBadges({
  rating,
  warnings,
  categories,
  complete,
  language,
}: {
  rating: StoryRating
  warnings: string[]
  categories: StoryCategory[]
  complete?: boolean
  language?: string
}) {
  return (
    <div className="story-meta-badges">
      <span className={`meta-badge rating rating-${rating}`}>{RATING_LABELS[rating] || rating}</span>
      {categories?.map((c) => (
        <span key={c} className="meta-badge category">
          {CATEGORY_LABELS[c] || c}
        </span>
      ))}
      {warnings?.length > 0 &&
        warnings.map((warning) => (
          <span key={warning} className="meta-badge warning">
            {warning}
          </span>
        ))}
      {complete !== undefined && (
        <span className={`meta-badge status ${complete ? 'complete' : 'in-progress'}`}>
          {complete ? 'Complete' : 'In Progress'}
        </span>
      )}
      {language && language !== 'English' && <span className="meta-badge language">{language}</span>}
    </div>
  )
}
