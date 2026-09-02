import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, apiErrorMessage } from '../api'
import ErrorAlert from './ErrorAlert'
import { useAuth } from '../AuthContext'

const TIP_AMOUNTS = [5, 10, 25]

export default function TipAuthor({
  storyId,
  authorName,
  tipsEnabled,
  tipTotal,
  tipCount,
  onTipped,
}: {
  storyId: number
  authorName: string
  tipsEnabled: boolean
  tipTotal: number
  tipCount: number
  onTipped: () => void
}) {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [amount, setAmount] = useState(5)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  if (!tipsEnabled) {
    return (
      <div className="tip-panel disabled">
        <p className="tip-label">Tip the author</p>
        <p className="muted">Tipping is disabled on fanfiction to respect original creators.</p>
      </div>
    )
  }

  const sendTip = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setSending(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.tipAuthor(storyId, amount, message)
      await refreshUser()
      setSuccess(res.message)
      setMessage('')
      onTipped()
    } catch (err) {
      setError(apiErrorMessage(err, 'Tip failed'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="tip-panel">
      <div className="tip-header">
        <p className="tip-label">Tip the author</p>
        {tipCount > 0 && (
          <span className="tip-stats">
            ◎ {tipTotal} total · {tipCount} tip{tipCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <p className="tip-desc">Send coins to {authorName} to say thanks.</p>

      <div className="tip-amounts">
        {TIP_AMOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            className={`tip-amount-btn ${amount === a ? 'active' : ''}`}
            onClick={() => setAmount(a)}
          >
            ◎ {a}
          </button>
        ))}
      </div>

      <input
        className="tip-message-input"
        placeholder="Optional message (200 chars)"
        maxLength={200}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {/* Honeypot — hidden from users, bots fill it */}
      <input type="text" name="_hp" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      {user ? (
        <button className="btn primary" onClick={sendTip} disabled={sending || (user.coins ?? 0) < amount}>
          {sending ? 'Sending…' : `Tip ◎ ${amount}`}
        </button>
      ) : (
        <Link to="/login" className="btn primary">Sign in to tip</Link>
      )}

      {user && (user.coins ?? 0) < amount && (
        <p className="muted tip-hint">Need more coins? <Link to="/wallet">Buy a pack</Link></p>
      )}

      {success && <p className="inline-notice tip-success">{success}</p>}
      {error && <ErrorAlert message={error} onClose={() => setError('')} />}
    </div>
  )
}
