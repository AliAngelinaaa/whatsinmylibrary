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
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function authorName(user: LineComment['user']) {
  return user.username || user.fullName
}

function flattenReplies(node: LineThread): LineThread[] {
  return node.replies.flatMap((child) => [child, ...flattenReplies(child)])
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

function InstagramComment({
  item,
  isReply,
  canReply,
  onReply,
}: {
  item: LineThread
  isReply?: boolean
  canReply: boolean
  onReply: (parentId: number, body: string) => Promise<void>
}) {
  const [replying, setReplying] = useState(false)
  const name = authorName(item.user)

  return (
    <div className={`ig-comment${isReply ? ' is-reply' : ''}`}>
      <Avatar user={item.user} size={isReply ? 'xs' : 'sm'} link />
      <div className="ig-comment-main">
        <p className="ig-comment-text">
          {userProfilePath(item.user) ? (
            <Link to={userProfilePath(item.user)!} className="ig-comment-user">
              {name}
            </Link>
          ) : (
            <strong className="ig-comment-user">{name}</strong>
          )}{' '}
          {item.body}
        </p>
        <div className="ig-comment-actions">
          <span>{timeAgo(item.createdAt)}</span>
          {canReply && (
            <button type="button" onClick={() => setReplying((open) => !open)}>
              {replying ? 'Cancel' : 'Reply'}
            </button>
          )}
        </div>
        {replying && (
          <InlineReplyForm
            placeholder={`Reply to ${name}…`}
            onCancel={() => setReplying(false)}
            onSubmit={async (body) => {
              await onReply(item.id, body)
              setReplying(false)
            }}
          />
        )}
      </div>
    </div>
  )
}

function InstagramThread({
  item,
  canReply,
  onReply,
}: {
  item: LineThread
  canReply: boolean
  onReply: (parentId: number, body: string) => Promise<void>
}) {
  const [showReplies, setShowReplies] = useState(true)
  const replies = flattenReplies(item)
  const count = replies.length

  return (
    <li className="ig-thread">
      <InstagramComment item={item} canReply={canReply} onReply={onReply} />
      {count > 0 && (
        <>
          <button
            type="button"
            className="ig-view-replies"
            onClick={() => setShowReplies((open) => !open)}
            aria-expanded={showReplies}
          >
            <span className="ig-view-replies-line" aria-hidden />
            {showReplies
              ? 'Hide replies'
              : `View ${count} ${count === 1 ? 'reply' : 'replies'}`}
          </button>
          {showReplies &&
            replies.map((reply) => (
              <InstagramComment
                key={reply.id}
                item={reply}
                isReply
                canReply={canReply}
                onReply={onReply}
              />
            ))}
        </>
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
          <InstagramThread
            key={item.id}
            item={item}
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
