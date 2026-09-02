import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage, type CommentUser } from '../api'
import Avatar, { userProfilePath } from './Avatar'
import ErrorAlert from './ErrorAlert'

export type ThreadItem = {
  id: number
  body: string
  createdAt: string
  user: CommentUser
  parentId?: number
  replies: ThreadItem[]
}

export function buildCommentTree<T extends { id: number; parentId?: number }>(
  flat: T[],
): (T & { replies: ReturnType<typeof buildCommentTree<T>> })[] {
  type Node = T & { replies: Node[] }
  const map = new Map<number, Node>()
  const roots: Node[] = []

  for (const item of flat) {
    map.set(item.id, { ...item, replies: [] })
  }

  for (const item of flat) {
    const node = map.get(item.id)!
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.replies.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export function countThreadNodes(items: ThreadItem[]): number {
  return items.reduce((sum, item) => sum + 1 + countThreadNodes(item.replies), 0)
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

type ReplyFormProps = {
  placeholder: string
  onSubmit: (body: string) => Promise<void>
  onCancel?: () => void
  compact?: boolean
}

function ReplyForm({ placeholder, onSubmit, onCancel, compact }: ReplyFormProps) {
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
    <div className={`thread-reply-form ${compact ? 'compact' : ''}`}>
      <textarea
        rows={compact ? 2 : 3}
        placeholder={placeholder}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <input type="text" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="thread-reply-form-actions">
        {onCancel && (
          <button type="button" className="btn ghost small-btn" onClick={onCancel}>Cancel</button>
        )}
        <button type="button" className="btn primary small-btn" onClick={submit} disabled={posting || !body.trim()}>
          {posting ? 'Posting…' : 'Reply'}
        </button>
      </div>
      {error && <ErrorAlert message={error} onClose={() => setError('')} />}
    </div>
  )
}

type ThreadNodeProps = {
  item: ThreadItem
  depth: number
  canReply: boolean
  onReply: (parentId: number, body: string) => Promise<void>
}

function ThreadNode({ item, depth, canReply, onReply }: ThreadNodeProps) {
  const [replying, setReplying] = useState(false)
  const maxDepth = 4

  return (
    <li className={`thread-node depth-${Math.min(depth, maxDepth)}`}>
      <article className="thread-comment">
        <Avatar user={item.user} size="sm" link className="comment-avatar" />
        <div className="thread-comment-main">
          <div className="comment-meta">
            {userProfilePath(item.user) ? (
              <Link to={userProfilePath(item.user)!} className="author-link">
                <strong>{item.user.username || item.user.fullName}</strong>
              </Link>
            ) : (
              <strong>{item.user.username || item.user.fullName}</strong>
            )}
            <span className="muted">{timeAgo(item.createdAt)}</span>
          </div>
          <p className="comment-body">{item.body}</p>
          {canReply && depth < maxDepth && (
            <button type="button" className="thread-reply-btn" onClick={() => setReplying(!replying)}>
              {replying ? 'Cancel' : 'Reply'}
            </button>
          )}
          {replying && (
            <ReplyForm
              compact
              placeholder="Write a reply…"
              onCancel={() => setReplying(false)}
              onSubmit={async (body) => {
                await onReply(item.id, body)
                setReplying(false)
              }}
            />
          )}
        </div>
      </article>
      {item.replies.length > 0 && (
        <ul className="thread-children">
          {item.replies.map((child) => (
            <ThreadNode
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

type ThreadedCommentsProps = {
  items: ThreadItem[]
  totalCount: number
  canReply: boolean
  emptyMessage: string
  topLevelPlaceholder: string
  onTopLevelSubmit: (body: string) => Promise<void>
  onReply: (parentId: number, body: string) => Promise<void>
}

export default function ThreadedComments({
  items,
  totalCount,
  canReply,
  emptyMessage,
  topLevelPlaceholder,
  onTopLevelSubmit,
  onReply,
}: ThreadedCommentsProps) {
  return (
    <div className="threaded-comments">
      {canReply && (
        <div className="thread-top-compose">
          <ReplyForm placeholder={topLevelPlaceholder} onSubmit={onTopLevelSubmit} />
        </div>
      )}

      {items.length === 0 ? (
        <p className="muted">{emptyMessage}</p>
      ) : (
        <ul className="thread-root-list">
          {items.map((item) => (
            <ThreadNode
              key={item.id}
              item={item}
              depth={0}
              canReply={canReply}
              onReply={onReply}
            />
          ))}
        </ul>
      )}

      {totalCount > 0 && (
        <p className="thread-count muted">{totalCount} comment{totalCount !== 1 ? 's' : ''} in thread</p>
      )}
    </div>
  )
}
