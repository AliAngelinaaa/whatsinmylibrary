import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { MONETIZATION_ENABLED } from '../features'

const PERKS = [
  'Bookmark stories and pick up where you left off',
  'Comment on chapters and join forum threads',
  'Build your public reader profile',
  ...(MONETIZATION_ENABLED ? ['50 free coins to unlock VIP chapters'] : []),
] as const

export default function LoginPage() {
  const { user, loginDev } = useAuth()
  const [email, setEmail] = useState('reader@example.com')
  const [name, setName] = useState('Demo Reader')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await loginDev(email, name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <aside className="login-promo">
          <p className="login-promo-tag">Join the library</p>
          <h1>Your shelf, your community</h1>
          <p className="hero-copy">
            Sign in once to bookmark chapters, comment, and build your public reader profile.
          </p>
          <ul className="login-perks">
            {PERKS.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
          <Link to="/browse" className="login-browse-link">
            Or keep browsing without an account →
          </Link>
        </aside>

        <div className="login-card">
          <p className="eyebrow">Welcome</p>
          <h2>Sign in to read & connect</h2>
          <p className="hero-copy login-card-lead">
            {MONETIZATION_ENABLED
              ? 'Dev mode login — you start with 50 free coins.'
              : 'Dev mode login — create your reader account.'}
          </p>

          <form onSubmit={submit} className="login-form">
            <label>
              Display name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            {error && <div className="inline-error">{error}</div>}
            <button className="btn primary full" disabled={loading}>
              {loading ? 'Signing in…' : 'Continue'}
            </button>
          </form>

          <div className="divider">or</div>

          <a href="/auth/google" className="btn secondary full google-btn">
            Continue with Google
          </a>
        </div>
      </div>
    </div>
  )
}
