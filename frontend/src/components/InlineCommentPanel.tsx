import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage, type LineComment } from '../api'
import Avatar, { userProfilePath } from './Avatar'
import ErrorAlert from './ErrorAlert'
import { buildCommentTree, countThreadNodes, type ThreadItem } from './ThreadedComments'

type Props = {
  comments: LineComment[]
  selectionQuote?: string
  canPost: boolean
  onClose: () => void
  onPost: (body: string, parentId?: number) => Promise<void>
}

type LineThread = LineComment & { replies: LineThread[] }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function InlineReplyForm({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string
  onSubmit: (body: string) => Promise<void>
  onCancel?: () => void
}) {
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!body.trim()) return
    setPosting(true)
    setError('')
    try {
      await onSubmit(body.trim())
      setBody('')
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to post'))
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="inline-comment-reply-form">
      <textarea
        rows={2}
        placeholder={placeholder}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        autoFocus
      />
      <input type="text" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="inline-comment-reply-actions">
        {onCancel && (
          <button type="button" className="btn ghost small-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="button" className="btn primary small-btn" onClick={submit} disabled={posting || !body.trim()}>
          {posting ? 'Posting…' : 'Reply'}
        </button>
      </div>
      {error && <ErrorAlert message={error} onClose={() => setError('')} />}
    </div>
  )
}

function InlineThreadNode({
  item,
  depth,
  canReply,
  onReply,
}: {
  item: LineThread
  depth: number
  canReply: boolean
  onReply: (parentId: number, body: string) => Promise<void>
}) {
  const [replying, setReplying] = useState(false)
  const maxDepth = 4

  return (
    <li className={`inline-thread-node depth-${Math.min(depth, maxDepth)}`}>
      <div className="inline-comment-panel-item">
        <div className="inline-comment-panel-user">
          <Avatar user={item.user} size="xs" link className="comment-avatar" />
          {userProfilePath(item.user) ? (
            <Link to={userProfilePath(item.user)!} className="author-link">
              <strong>{item.user.username || item.user.fullName}</strong>
            </Link>
          ) : (
            <strong>{item.user.username || item.user.fullName}</strong>
          )}
          <span className="muted inline-comment-time">{timeAgo(item.createdAt)}</span>
        </div>
        {item.selectedText && depth === 0 && (
          <p className="inline-comment-panel-quote">"{item.selectedText}"</p>
        )}
        <p className="inline-comment-panel-body">{item.body}</p>
        {canReply && depth < maxDepth && (
          <button
            type="button"
            className="thread-reply-btn"
            onClick={() => setReplying((open) => !open)}
          >
            {replying ? 'Cancel' : 'Reply'}
          </button>
        )}
        {replying && (
          <InlineReplyForm
            placeholder="Write a reply…"
            onCancel={() => setReplying(false)}
            onSubmit={async (body) => {
              await onReply(item.id, body)
              setReplying(false)
            }}
          />
        )}
      </div>
      {item.replies.length > 0 && (
        <ul className="inline-thread-children">
          {item.replies.map((child) => (
            <InlineThreadNode
              key={child.id}
              item={child}
              depth={depth + 1}
              canReply={canReply}
              onReply={onReply}
            />
          ))}
        </ul>
      )}
    </li>
  )
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

  const tree = buildCommentTree(comments) as LineThread[]
  const total = countThreadNodes(tree as ThreadItem[])

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
          {total} comment{total !== 1 ? 's' : ''}
        </span>
        <button type="button" className="inline-comment-panel-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <ul className="inline-comment-panel-list">
        {tree.length === 0 && !selectionQuote && (
          <li className="muted inline-comment-empty">No comments on this paragraph yet.</li>
        )}
        {tree.map((item) => (
          <InlineThreadNode
            key={item.id}
            item={item}
            depth={0}
            canReply={canPost}
            onReply={(parentId, replyBody) => onPost(replyBody, parentId)}
          />
        ))}
      </ul>

      {canPost && (
        <div className="inline-comment-panel-compose">
          {selectionQuote && (
            <p className="inline-comment-panel-selection">On: "{selectionQuote.slice(0, 100)}{selectionQuote.length > 100 ? '…' : ''}"</p>
          )}
          <textarea
            rows={2}
            placeholder={tree.length > 0 ? 'Add to this thread…' : 'Leave a comment…'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
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
