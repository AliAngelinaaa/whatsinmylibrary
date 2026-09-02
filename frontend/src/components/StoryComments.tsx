import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type StoryComment } from '../api'
import { useAuth } from '../AuthContext'
import ThreadedComments, { buildCommentTree, countThreadNodes, type ThreadItem } from './ThreadedComments'

export default function StoryComments({ storyId }: { storyId: number }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [comments, setComments] = useState<StoryComment[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    api.storyComments(storyId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [storyId])

  const tree = useMemo(
    () => buildCommentTree(comments) as ThreadItem[],
    [comments],
  )
  const totalCount = countThreadNodes(tree)

  const requireAuth = () => {
    if (!user) {
      navigate('/login')
      return false
    }
    return true
  }

  const postTopLevel = async (body: string) => {
    if (!requireAuth()) return
    const comment = await api.postStoryComment(storyId, body)
    setComments((prev) => [...prev, comment])
  }

  const postReply = async (parentId: number, body: string) => {
    if (!requireAuth()) return
    const comment = await api.postStoryComment(storyId, body, parentId)
    setComments((prev) => [...prev, comment])
  }

  return (
    <section className="comments-section">
      <h2>Comments ({totalCount})</h2>

      {loading ? (
        <p className="muted">Loading comments…</p>
      ) : (
        <ThreadedComments
          items={tree}
          totalCount={totalCount}
          canReply={!!user}
          emptyMessage="No comments yet — be the first!"
          topLevelPlaceholder={user ? 'Share your thoughts on this story…' : 'Sign in to comment'}
          onTopLevelSubmit={postTopLevel}
          onReply={postReply}
        />
      )}

      {!user && (
        <p className="muted thread-signin-hint">
          <Link to="/login">Sign in</Link> to join the conversation.
        </p>
      )}
    </section>
  )
}
