import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type ForumReply, type ForumThreadDetail } from '../api'
import { useAuth } from '../AuthContext'
import Avatar, { userProfilePath } from '../components/Avatar'
import ThreadedComments, { buildCommentTree, countThreadNodes, type ThreadItem } from '../components/ThreadedComments'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ForumThreadPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [thread, setThread] = useState<ForumThreadDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const threadId = Number(id)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/forum', { replace: true })
      return
    }
    setLoading(true)
    api.forumThread(threadId)
      .then(setThread)
      .catch(() => setThread(null))
      .finally(() => setLoading(false))
  }, [threadId, user, authLoading, navigate])

  const replyTree = useMemo(
    () => (thread ? buildCommentTree(thread.replies as (ForumReply & { parentId?: number })[]) as ThreadItem[] : []),
    [thread],
  )
  const replyCount = thread ? countThreadNodes(replyTree) : 0

  const requireAuth = () => {
    if (!user) {
      navigate('/login')
      return false
    }
    return true
  }

  const postTopLevel = async (body: string) => {
    if (!requireAuth()) return
    await api.postForumReply(threadId, body)
    const updated = await api.forumThread(threadId)
    setThread(updated)
  }

  const postReply = async (parentId: number, body: string) => {
    if (!requireAuth()) return
    await api.postForumReply(threadId, body, parentId)
    const updated = await api.forumThread(threadId)
    setThread(updated)
  }

  if (authLoading || (!user && !loading)) {
    return <div className="page-state">Loading…</div>
  }

  if (loading) return <div className="page-state">Loading thread…</div>
  if (!thread) return <div className="page-state error">Thread not found</div>

  return (
    <div className="forum-thread-page">
      <Link to="/forum" className="btn ghost">← Back to forum</Link>

      <article className="forum-thread-op">
        <p className="eyebrow">{thread.category.name}</p>
        <h1>{thread.title}</h1>
        <div className="forum-op-header">
          <Avatar user={thread.user} size="sm" link className="comment-avatar" />
          <div>
            {userProfilePath(thread.user) ? (
              <Link to={userProfilePath(thread.user)!} className="author-link">
                <strong>{thread.user.username || thread.user.fullName}</strong>
              </Link>
            ) : (
              <strong>{thread.user.username || thread.user.fullName}</strong>
            )}
            <span className="muted"> · {timeAgo(thread.createdAt)} · Original post</span>
          </div>
        </div>
        <p className="forum-post-body">{thread.body}</p>
      </article>

      <section className="forum-replies-section">
        <h2>{replyCount} repl{replyCount !== 1 ? 'ies' : 'y'}</h2>

        <ThreadedComments
          items={replyTree}
          totalCount={replyCount}
          canReply={!!user}
          emptyMessage="No replies yet — be the first to respond."
          topLevelPlaceholder={user ? 'Reply to this thread…' : 'Sign in to reply'}
          onTopLevelSubmit={postTopLevel}
          onReply={postReply}
        />

        {!user && (
          <p className="muted thread-signin-hint">
            <Link to="/login">Sign in</Link> to reply.
          </p>
        )}
      </section>
    </div>
  )
}
