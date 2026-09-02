import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

type Props = {
  storyId: number
  bookmarked: boolean
  bookmarkPublic: boolean
  bookmarkNote: string
  onChange: (data: { bookmarked: boolean; bookmarkPublic: boolean; bookmarkNote: string }) => void
}

export default function StoryBookmark({ storyId, bookmarked, bookmarkPublic, bookmarkNote, onChange }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState(bookmarkNote)
  const [isPublic, setIsPublic] = useState(bookmarkPublic)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const requireAuth = () => {
    if (!user) {
      navigate('/login')
      return false
    }
    return true
  }

  const toggle = async () => {
    if (!requireAuth()) return
    setNote(bookmarkNote)
    setIsPublic(bookmarkPublic)
    setOpen(true)
  }

  const remove = async () => {
    if (!requireAuth()) return
    setSaving(true)
    setError('')
    try {
      await api.removeBookmark(storyId)
      onChange({ bookmarked: false, bookmarkPublic: false, bookmarkNote: '' })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove bookmark')
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (!requireAuth()) return
    setSaving(true)
    setError('')
    try {
      const result = await api.setBookmark(storyId, { note: note.trim(), isPublic })
      onChange({
        bookmarked: true,
        bookmarkPublic: result.bookmarkPublic,
        bookmarkNote: result.bookmarkNote,
      })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save bookmark')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="story-bookmark-panel">
      <button
        type="button"
        className={`btn ${bookmarked ? 'primary' : 'secondary'} full`}
        onClick={toggle}
        disabled={saving}
      >
        {saving && !open ? 'Saving…' : bookmarked ? '★ Edit bookmark' : '☆ Bookmark'}
      </button>

      {bookmarked && !open && (
        <p className="field-hint bookmark-status-hint">
          {bookmarkPublic ? 'Public on your profile' : 'Private — only you can see this'}
        </p>
      )}

      {open && (
        <div className="bookmark-editor">
          <label>
            Bookmarker&apos;s notes
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why you saved this, where you left off, etc."
            />
          </label>
          <label className="toggle-row compact">
            <span className="toggle-copy">
              <span className="toggle-label">Show on my profile</span>
              <span className="toggle-hint">Public bookmarks appear on your Bookmarks tab for other readers.</span>
            </span>
            <span className="toggle-switch">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              <span className="toggle-track" aria-hidden />
            </span>
          </label>
          <div className="bookmark-editor-actions">
            {bookmarked && (
              <button type="button" className="btn ghost danger-text" onClick={remove} disabled={saving}>
                Remove
              </button>
            )}
            <button type="button" className="btn ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : bookmarked ? 'Update bookmark' : 'Save bookmark'}
            </button>
          </div>
          {error && <p className="inline-error">{error}</p>}
        </div>
      )}
    </div>
  )
}
