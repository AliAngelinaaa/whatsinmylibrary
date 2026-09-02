import { Link } from 'react-router-dom'

const SPACES = [
  {
    icon: '💬',
    name: 'General',
    desc: 'Introduce yourself and chat about whatever you are reading.',
  },
  {
    icon: '✨',
    name: 'Recommendations',
    desc: 'Ask for recs or share the hidden gem that wrecked you.',
  },
  {
    icon: '✍️',
    name: 'Writing & craft',
    desc: 'Plot holes, pacing, betas, and publishing talk.',
  },
  {
    icon: '🌀',
    name: 'Fanfiction corner',
    desc: 'AUs, ships, tropes — fanfic readers welcome.',
  },
  {
    icon: '🛠',
    name: 'Site feedback',
    desc: 'Bugs, feature requests, and wild ideas.',
  },
] as const

const CHALLENGES = [
  {
    tag: 'Monthly',
    title: 'Reading sprint',
    desc: 'Finish three serials in a genre you have never tried. Track progress with the community.',
    status: 'Coming soon',
  },
  {
    tag: 'Weekly',
    title: 'Rec roulette',
    desc: 'Get matched with a story pick from another reader. Post your review when you are done.',
    status: 'Coming soon',
  },
  {
    tag: 'Seasonal',
    title: 'Trope bingo',
    desc: 'Fill a card with found family, slow burn, enemies to lovers — you know the drill.',
    status: 'Coming soon',
  },
  {
    tag: 'For writers',
    title: 'Prompt drops',
    desc: 'Fresh writing prompts every Friday. Draft a scene, share a snippet, cheer each other on.',
    status: 'Coming soon',
  },
] as const

export default function CommunityHubLanding({
  variant = 'full',
  embedded = false,
}: {
  variant?: 'full' | 'compact'
  embedded?: boolean
}) {
  const isFull = variant === 'full'

  return (
    <section className={`community-hub ${isFull ? 'community-hub-page' : 'community-hub-home'}${embedded ? ' community-hub-embedded' : ''}`}>
      {!embedded && (
        <div className="community-hub-hero">
          <p className="community-hub-tag">Members only</p>
          <h2>{isFull ? 'Community & challenges' : 'Join the community'}</h2>
          <p className="hero-copy">
            {isFull
              ? 'The forum is where readers swap recs, writers talk craft, and everyone argues about ships. Sign in to read threads, post, and join challenges as they roll out.'
              : 'Swap recs, talk craft, and join reading challenges — all behind the library doors.'}
          </p>
          <div className="community-hub-actions">
            <Link to="/login" className="btn primary">
              Sign in to enter
            </Link>
            <Link to="/browse" className="btn secondary">
              Keep reading stories
            </Link>
          </div>
        </div>
      )}

      <div className={`community-hub-grid${isFull ? '' : ' community-hub-grid-compact'}`}>
        <div className="community-hub-panel">
          <div className="community-hub-panel-head">
            <h3>Discussion spaces</h3>
            <p>Five rooms for readers and writers — threads unlock once you are signed in.</p>
          </div>
          <ul className="community-space-list">
            {SPACES.map(({ icon, name, desc }) => (
              <li key={name} className="community-space-card">
                <span className="community-space-icon" aria-hidden>{icon}</span>
                <div>
                  <strong>{name}</strong>
                  <p>{desc}</p>
                </div>
                <span className="community-lock" aria-label="Sign in required">🔒</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="community-hub-panel community-challenges-panel">
          <div className="community-hub-panel-head">
            <h3>Challenges</h3>
            <p>Reading sprints, rec swaps, and trope bingo — built for people who treat TBR lists like sport.</p>
          </div>
          <ul className="community-challenge-list">
            {CHALLENGES.slice(0, isFull ? CHALLENGES.length : 3).map(({ tag, title, desc, status }) => (
              <li key={title} className="community-challenge-card">
                <span className="community-challenge-tag">{tag}</span>
                <strong>{title}</strong>
                <p>{desc}</p>
                <span className="community-challenge-status">{status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="community-hub-foot">
        <p>
          <strong>Why sign in?</strong> Bookmark chapters, comment on stories, post in the forum, and be first in line when challenges launch.
        </p>
        {!isFull && !embedded && (
          <Link to="/forum" className="home-see-more">
            See the full community hub →
          </Link>
        )}
      </div>
    </section>
  )
}
