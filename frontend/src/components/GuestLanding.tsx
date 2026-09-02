import { Link } from 'react-router-dom'
import type { Genre, StorySummary } from '../api'

const READER_REACTIONS = [
  {
    handle: 'slowburn_stan',
    text: 'SOMEONE PASS THE POPCORN 🍿',
    likes: 98,
  },
  {
    handle: 'chapter_cryer',
    text: 'from banter to BREAKUP in two paragraphs? 😭',
    likes: 95,
  },
  {
    handle: 'ship_on_main',
    text: 'What in the fanfic?! (i love it)',
    likes: 113,
  },
  {
    handle: 'one_more_chapter',
    text: "we're all collectively losing our minds over this chapter right?",
    likes: 105,
  },
] as const

const JOIN_REASONS = [
  {
    icon: '📖',
    title: 'Read the whole chapter',
    desc: 'Free account, full stories — pick up where you left off.',
  },
  {
    icon: '💬',
    title: 'React in the comments',
    desc: 'Highlight a line. Scream in the margins. Find your people.',
  },
  {
    icon: '🏆',
    title: 'Join challenges',
    desc: 'Reading sprints, rec roulette, and trope bingo — coming soon.',
  },
] as const

function CoverCarousel({
  stories,
  seeAllTo,
}: {
  stories: StorySummary[]
  seeAllTo?: string
}) {
  if (stories.length === 0) return null

  return (
    <div className="wp-carousel-wrap">
      <div className="wp-cover-carousel" tabIndex={0}>
        {stories.map((story) => (
          <Link key={story.id} to={`/story/${story.id}`} className="wp-cover-card">
            <span className="wp-cover-art" style={{ background: story.coverColor }} />
            <span className="wp-cover-title">{story.title}</span>
          </Link>
        ))}
        {seeAllTo && (
          <Link to={seeAllTo} className="wp-cover-see-all">
            See all
          </Link>
        )}
      </div>
    </div>
  )
}

function ReactionCard({ handle, text, likes }: (typeof READER_REACTIONS)[number]) {
  return (
    <div className="wp-reaction-card">
      <p className="wp-reaction-handle">@{handle}</p>
      <p className="wp-reaction-text">{text}</p>
      <p className="wp-reaction-likes">{likes}</p>
    </div>
  )
}

export default function GuestLanding({
  genres,
  trending,
  fanfics,
  originals,
}: {
  genres: Genre[]
  trending: StorySummary[]
  fanfics: StorySummary[]
  originals: StorySummary[]
}) {
  return (
    <div className="guest-home wattpad-landing">
      <section className="wp-hero">
        <h1>
          Come for the story.
          <span>Stay for the connection.</span>
        </h1>
        <p className="wp-hero-sub">
          Stories better than scrolling. Comments better than your group chat.
        </p>
        <div className="wp-hero-cta">
          <Link to="/login" className="btn primary wp-btn-lg">
            Get started — it&apos;s free
          </Link>
          <p className="wp-hero-login">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </section>

      <section className="wp-reactions-row" aria-label="Reader reactions">
        {READER_REACTIONS.map((r) => (
          <ReactionCard key={r.handle} {...r} />
        ))}
      </section>

      {trending.length > 0 && (
        <section className="wp-section wp-bleed">
          <h2 className="wp-section-title">Trending now</h2>
          <CoverCarousel stories={trending} seeAllTo="/browse" />
        </section>
      )}

      {fanfics.length > 0 && (
        <section className="wp-section wp-bleed">
          <h2 className="wp-section-title">Must-read fanfiction</h2>
          <CoverCarousel stories={fanfics} seeAllTo="/fanfics" />
        </section>
      )}

      <section className="wp-section wp-reasons">
        <h2 className="wp-section-title">Why readers join</h2>
        <div className="wp-reason-grid">
          {JOIN_REASONS.map(({ icon, title, desc }) => (
            <div key={title} className="wp-reason-card">
              <span className="wp-reason-icon" aria-hidden>{icon}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {originals.length > 0 && (
        <section className="wp-section wp-bleed">
          <h2 className="wp-section-title">From the stacks</h2>
          <p className="wp-section-lead">Original stories written for this library.</p>
          <CoverCarousel stories={originals} seeAllTo="/originals" />
        </section>
      )}

      {genres.length > 0 && (
        <section className="wp-section wp-genres-section">
          <h2 className="wp-section-title wp-genres-headline">
            All the genres. All the tropes. All you.
          </h2>
          <p className="wp-section-lead">
            Find your next favorite read, no matter your mood or vibe.
          </p>
          <div className="wp-genre-grid">
            {genres.map((genre) => (
              <Link
                key={genre.slug}
                to={`/browse?genre=${encodeURIComponent(genre.name)}`}
                className="wp-genre-cell"
              >
                {genre.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="wp-section wp-bookclub">
        <h2 className="wp-section-title">Your book club, but bigger</h2>
        <p className="wp-section-lead">
          Recs, craft talk, ships, and challenges — the forum unlocks when you sign in.
        </p>
        <ul className="wp-club-list">
          <li>
            <strong>Discussion spaces</strong>
            <span>General, recs, writing, fanfic, and feedback.</span>
          </li>
          <li>
            <strong>Reading sprint</strong>
            <span>Finish three stories in a genre you have never tried.</span>
          </li>
          <li>
            <strong>Trope bingo</strong>
            <span>Found family. Slow burn. Enemies to lovers. You know the drill.</span>
          </li>
        </ul>
        <Link to="/login" className="btn primary wp-btn-lg">
          Join the community
        </Link>
      </section>

      <section className="wp-final-cta">
        <h2>Start reading where the fandom is</h2>
        <p>Create a free account to read chapters, bookmark your place, and talk about the plot twist.</p>
        <Link to="/login" className="btn primary wp-btn-lg">
          Get started — it&apos;s free
        </Link>
        <Link to="/browse" className="wp-browse-link">
          Browse stories first
        </Link>
      </section>
    </div>
  )
}
