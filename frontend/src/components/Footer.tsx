import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { MONETIZATION_ENABLED } from '../features'

const DISCOVER_LINKS = [
  { to: '/browse', label: 'Browse all' },
  { to: '/originals', label: 'Originals' },
  { to: '/fanfics', label: 'Fanfics' },
  ...(MONETIZATION_ENABLED ? [{ to: '/vip' as const, label: 'VIP chapters' }] : []),
] as const

const COMMUNITY_LINKS = [
  { to: '/forum', label: 'Community hub' },
] as const

export default function Footer() {
  const { user } = useAuth()
  const year = new Date().getFullYear()

  const publicPath = user?.username ? `/user/${user.username}` : null
  const accountLinks = user
    ? [
        { to: publicPath || '/me', label: 'Your profile' },
        { to: '/profile', label: 'Settings' },
        ...(MONETIZATION_ENABLED ? [{ to: '/wallet' as const, label: 'Wallet' }] : []),
      ]
    : [
        { to: '/login', label: 'Join free' },
        { to: '/browse', label: 'Browse stories' },
      ]

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <span className="brand-mark">◈</span>
            WhatsInMyLibrary
          </Link>
          <p className="footer-tagline">
            Read serial fiction, bookmark your favorites, and join the conversation.
          </p>
        </div>

        <div className="footer-columns">
          <div className="footer-col">
            <h3>Discover</h3>
            <ul>
              {DISCOVER_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h3>Community</h3>
            <ul>
              {COMMUNITY_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h3>Account</h3>
            <ul>
              {accountLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {year} WhatsInMyLibrary. Story content is protected — read and support writers here.</p>
      </div>
    </footer>
  )
}
