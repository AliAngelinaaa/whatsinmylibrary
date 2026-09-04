import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { MONETIZATION_ENABLED } from '../features'
import Avatar, { userProfilePath } from './Avatar'
import Footer from './Footer'
import NavSearch from './NavSearch'

const BROWSE_LINKS = [
  { to: '/originals', label: 'Originals' },
  { to: '/fanfics', label: 'Fanfics' },
  ...(MONETIZATION_ENABLED ? [{ to: '/vip' as const, label: 'VIP' }] : []),
] as const

const BROWSE_PATHS = ['/browse', '/originals', '/fanfics', ...(MONETIZATION_ENABLED ? ['/vip'] : [])]

const USER_MENU_ITEMS = [
  { to: 'public', label: 'View public profile' },
  { to: '/write', label: 'My works' },
  { to: '/profile', label: 'Settings' },
  { to: '/profile?tab=notifications', label: 'Notification preferences' },
  { to: '/profile?tab=reading', label: 'Display & reading' },
] as const

function greetingName(user: { username?: string; fullName: string }) {
  if (user.username) return user.username
  return user.fullName.split(' ')[0] || user.fullName
}

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isReading = /\/story\/\d+\/read\//.test(location.pathname)

  const isActive = (to: string, end?: boolean) => {
    if (end) return location.pathname === to
    return location.pathname === to || location.pathname.startsWith(`${to}/`)
  }

  const menuItemActive = (to: string) => {
    if (!to.startsWith('/profile')) return isActive(to)
    if (location.pathname !== '/profile') return false
    const tab = new URL(to, 'http://local').searchParams.get('tab')
    const currentTab = new URLSearchParams(location.search).get('tab')
    return tab ? currentTab === tab : !currentTab
  }

  useEffect(() => {
    setNavOpen(false)
    setMenuOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setNavOpen(false)
      }
    }
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [])

  return (
    <div className={`app-shell${user ? '' : ' guest'}${isReading ? ' reading' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden>◈</span>
          <span className="brand-name">WhatsInMyLibrary</span>
        </Link>

        <button
          type="button"
          className={`nav-toggle ${navOpen ? 'open' : ''}`}
          aria-expanded={navOpen}
          aria-controls="main-nav"
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setNavOpen((open) => !open)}
        >
          <span className="nav-toggle-icon" aria-hidden>{navOpen ? '✕' : '☰'}</span>
        </button>

        <nav id="main-nav" className={`topnav ${navOpen ? 'open' : ''}`} aria-label="Main">
          <Link to="/" className={`topnav-link ${isActive('/', true) ? 'active' : ''}`}>
            Home
          </Link>
          <div className="browse-nav">
            <Link
              to="/browse"
              className={`topnav-link browse-nav-link ${BROWSE_PATHS.includes(location.pathname) ? 'active' : ''}`}
            >
              Browse
              <span className="browse-nav-chevron" aria-hidden>▾</span>
            </Link>
            <div className="browse-nav-dropdown" role="menu">
              {BROWSE_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  role="menuitem"
                  className={`browse-nav-item ${isActive(to) ? 'active' : ''}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <Link to="/forum" className={`topnav-link ${isActive('/forum') ? 'active' : ''}`}>
            Community
          </Link>
        </nav>

        <NavSearch />

        <div className="topbar-actions">
          {user ? (
            <>
              {MONETIZATION_ENABLED && (
                <Link to="/wallet" className={`coin-badge ${isActive('/wallet') ? 'active' : ''}`} title="Your coin balance">
                  <span className="coin-icon" aria-hidden>◎</span>
                  <span className="sr-only">Coin balance</span>
                  {user.coins}
                </Link>
              )}
              <div
                className={`user-menu ${menuOpen ? 'open' : ''}`}
                ref={menuRef}
                onMouseEnter={() => setMenuOpen(true)}
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  type="button"
                  className="user-chip user-menu-trigger"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={`Account menu for ${greetingName(user)}`}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <Avatar user={user} size="sm" />
                  <span className="user-name">{user.username || user.fullName}</span>
                  <span className="user-menu-chevron" aria-hidden>▾</span>
                </button>
                <div className="user-menu-dropdown" role="menu">
                  <p className="user-menu-hello">Hi, {greetingName(user)}</p>
                  {USER_MENU_ITEMS.map(({ to, label }) => {
                    if (to === 'public') {
                      const path = userProfilePath(user)
                      return (
                        <Link
                          key={to}
                          to={path || '/profile'}
                          role="menuitem"
                          className={`user-menu-item ${path && location.pathname === path ? 'active' : ''}`}
                        >
                          {path ? label : 'Set up public profile'}
                        </Link>
                      )
                    }
                    return (
                      <Link
                        key={to}
                        to={to}
                        role="menuitem"
                        className={`user-menu-item ${menuItemActive(to) ? 'active' : ''}`}
                      >
                        {label}
                      </Link>
                    )
                  })}
                  <div className="user-menu-divider" role="separator" />
                  <button type="button" role="menuitem" className="user-menu-item danger" onClick={logout}>
                    Log out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="guest-login-text">
                Log in
              </Link>
              <Link to="/login" className="btn primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>

      <main id="main-content" className="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
