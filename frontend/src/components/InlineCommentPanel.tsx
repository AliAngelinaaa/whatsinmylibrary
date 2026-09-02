import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage, type LineComment } from '../api'
import Avatar, { userProfilePath } from './Avatar'
import ErrorAlert from './ErrorAlert'

type Props = {
  comments: LineComment[]
  selectionQuote?: string
  canPost: boolean
  onClose: () => void
  onPost: (body: string) => Promise<void>
}

export default function InlineCommentPanel({
  comments,
  selectionQuote,
  canPost,
  onClose,
  onPost,
}: Props) {
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!body.trim()) return
    setPosting(true)
    setError('')
    try {
      await onPost(body.trim())
      setBody('')
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to post'))
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="inline-comment-panel">
      <div className="inline-comment-panel-header">
        <span className="inline-comment-panel-title">
          {comments.length} comment{comments.length !== 1 ? 's' : ''}
        </span>
        <button type="button" className="inline-comment-panel-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <ul className="inline-comment-panel-list">
        {comments.length === 0 && !selectionQuote && (
          <li className="muted inline-comment-empty">No comments on this paragraph yet.</li>
        )}
        {comments.map((c) => (
          <li key={c.id} className="inline-comment-panel-item">
            <div className="inline-comment-panel-user">
              <Avatar user={c.user} size="xs" link className="comment-avatar" />
              {userProfilePath(c.user) ? (
                <Link to={userProfilePath(c.user)!} className="author-link">
                  <strong>{c.user.username || c.user.fullName}</strong>
                </Link>
              ) : (
                <strong>{c.user.username || c.user.fullName}</strong>
              )}
            </div>
            {c.selectedText && (
              <p className="inline-comment-panel-quote">"{c.selectedText}"</p>
            )}
            <p className="inline-comment-panel-body">{c.body}</p>
          </li>
        ))}
      </ul>

      {canPost && (
        <div className="inline-comment-panel-compose">
          {selectionQuote && (
            <p className="inline-comment-panel-selection">On: "{selectionQuote.slice(0, 100)}{selectionQuote.length > 100 ? '…' : ''}"</p>
          )}
          <textarea
            rows={2}
            placeholder="Leave a comment…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            autoFocus
          />
          <input type="text" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <button type="button" className="btn primary full" onClick={submit} disabled={posting || !body.trim()}>
            {posting ? 'Posting…' : 'Post'}
          </button>
          {error && <ErrorAlert message={error} onClose={() => setError('')} />}
        </div>
      )}
    </div>
  )
}
