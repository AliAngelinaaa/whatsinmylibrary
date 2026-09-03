import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  api,
  apiErrorMessage,
  CATEGORY_LABELS,
  RATING_LABELS,
  WARNING_OPTIONS,
  type ChapterPreview,
  type Genre,
  type StoryCategory,
  type StoryDetail,
  type StoryRating,
} from '../api'
import TagInput from '../components/TagInput'
import { coverStyle } from '../utils/cover'

const RATINGS: StoryRating[] = ['not-rated', 'general', 'teen', 'mature', 'explicit']
const CATEGORIES: StoryCategory[] = ['ff', 'fm', 'gen', 'mm', 'multi', 'other']

function tagNamesByCategory(story: StoryDetail | null, category: string) {
  if (!story) return []
  return story.tags.filter((t) => (t.category || 'freeform') === category).map((t) => t.name)
}

export default function StoryEditPage() {
  const { storyId } = useParams()
  const navigate = useNavigate()
  const creatingRef = useRef(false)

  const [story, setStory] = useState<StoryDetail | null>(null)
  const [genres, setGenres] = useState<Genre[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [language, setLanguage] = useState('English')
  const [rating, setRating] = useState<StoryRating>('not-rated')
  const [warnings, setWarnings] = useState<string[]>([])
  const [categories, setCategories] = useState<StoryCategory[]>([])
  const [fandomTags, setFandomTags] = useState<string[]>([])
  const [relationshipTags, setRelationshipTags] = useState<string[]>([])
  const [characterTags, setCharacterTags] = useState<string[]>([])
  const [freeformTags, setFreeformTags] = useState<string[]>([])
  const [coAuthorInput, setCoAuthorInput] = useState('')
  const [coAuthors, setCoAuthors] = useState<string[]>([])
  const [complete, setComplete] = useState(false)
  const [commentsEnabled, setCommentsEnabled] = useState(true)

  const isNew = storyId === 'new'

  useEffect(() => {
    if (!isNew) return
    if (creatingRef.current) return
    creatingRef.current = true
    api
      .createStory()
      .then(({ id }) => navigate(`/write/${id}`, { replace: true }))
      .catch((err) => setError(apiErrorMessage(err, 'Failed to create work')))
  }, [isNew, navigate])

  const numericId = Number(storyId)

  const load = () => {
    if (isNew || !storyId || Number.isNaN(numericId)) return
    setLoading(true)
    api
      .story(numericId)
      .then((s) => {
        setStory(s)
        setTitle(s.title)
        setDescription(s.description)
        setGenre(s.genre)
        setLanguage(s.language || 'English')
        setRating(s.rating)
        setWarnings(s.warnings || [])
        setCategories(s.categories || [])
        setFandomTags(tagNamesByCategory(s, 'fandom'))
        setRelationshipTags(tagNamesByCategory(s, 'relationship'))
        setCharacterTags(tagNamesByCategory(s, 'character'))
        setFreeformTags(tagNamesByCategory(s, 'freeform'))
        setCoAuthors((s.coAuthors || []).map((u) => u.username).filter(Boolean))
        setComplete(s.complete)
        setCommentsEnabled(s.commentsEnabled)
      })
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load work')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [storyId])

  useEffect(() => {
    api.genres().then(setGenres).catch(() => {})
  }, [])

  const toggleWarning = (warning: string) => {
    setWarnings((prev) => (prev.includes(warning) ? prev.filter((w) => w !== warning) : [...prev, warning]))
  }

  const toggleCategory = (cat: StoryCategory) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))
  }

  const addCoAuthor = () => {
    const name = coAuthorInput.trim()
    if (!name || coAuthors.includes(name)) {
      setCoAuthorInput('')
      return
    }
    setCoAuthors([...coAuthors, name])
    setCoAuthorInput('')
  }

  const removeCoAuthor = (name: string) => {
    setCoAuthors(coAuthors.filter((c) => c !== name))
  }

  const isFanfiction = genre.trim().toLowerCase() === 'fanfiction'

  const buildTagPayload = () => [
    ...(isFanfiction ? fandomTags.map((name) => ({ name, category: 'fandom' as const })) : []),
    ...relationshipTags.map((name) => ({ name, category: 'relationship' as const })),
    ...characterTags.map((name) => ({ name, category: 'character' as const })),
    ...freeformTags.map((name) => ({ name, category: 'freeform' as const })),
  ]

  const handleSave = async () => {
    if (!story) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await api.updateStory(story.id, {
        title,
        description,
        genre,
        language,
        rating,
        warnings,
        categories,
        coAuthors,
        tags: buildTagPayload(),
        complete,
        commentsEnabled,
      })
      setMessage('Saved.')
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save changes'))
    } finally {
      setSaving(false)
    }
  }

  const handlePublishToggle = async () => {
    if (!story) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await api.updateStory(story.id, { status: story.status === 'published' ? 'draft' : 'published' })
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update status'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!story) return
    if (!window.confirm(`Delete "${story.title}" and all its chapters? This can't be undone.`)) return
    setSaving(true)
    try {
      await api.deleteStory(story.id)
      navigate('/write')
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to delete work'))
      setSaving(false)
    }
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !story) return
    setUploadingCover(true)
    setError('')
    try {
      await api.uploadStoryCover(story.id, file)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Cover upload failed'))
    } finally {
      setUploadingCover(false)
      e.target.value = ''
    }
  }

  const handleAddChapter = async () => {
    if (!story) return
    try {
      const { id } = await api.createChapter(story.id)
      navigate(`/write/${story.id}/chapters/${id}`)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to create chapter'))
    }
  }

  const handleDeleteChapter = async (chapter: ChapterPreview) => {
    if (!window.confirm(`Delete chapter "${chapter.title}"?`)) return
    try {
      await api.deleteChapter(chapter.id)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to delete chapter'))
    }
  }

  const handleMoveChapter = async (index: number, direction: -1 | 1) => {
    if (!story) return
    const chapters = [...story.chapters]
    const target = index + direction
    if (target < 0 || target >= chapters.length) return
    ;[chapters[index], chapters[target]] = [chapters[target], chapters[index]]
    try {
      await api.reorderChapters(story.id, chapters.map((c) => c.id))
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to reorder chapters'))
    }
  }

  const publishBlocked = useMemo(
    () => !!story && story.status !== 'published' && !story.chapters.some((c) => c.published),
    [story],
  )

  if (isNew || loading) return <div className="page-state">{isNew ? 'Setting up your new work…' : 'Loading…'}</div>
  if (!story) return <div className="page-state error">{error || 'Work not found'}</div>

  return (
    <div className="story-edit-page">
      <div className="story-edit-header">
        <div>
          <Link to="/write" className="btn ghost small-btn">
            ← My works
          </Link>
          <h1>{title || 'Untitled work'}</h1>
          <span className={`status-pill ${story.status}`}>{story.status === 'published' ? 'Published' : 'Draft'}</span>
        </div>
        <div className="story-edit-header-actions">
          <button type="button" className="btn ghost danger" onClick={handleDelete} disabled={saving}>
            Delete work
          </button>
          <Link to={`/story/${story.id}`} target="_blank" rel="noreferrer" className="btn ghost">
            Preview
          </Link>
          <button
            type="button"
            className="btn secondary"
            onClick={handlePublishToggle}
            disabled={saving || publishBlocked}
            title={publishBlocked ? 'Publish at least one chapter first' : undefined}
          >
            {story.status === 'published' ? 'Unpublish' : 'Publish work'}
          </button>
          <button type="button" className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save details'}
          </button>
        </div>
      </div>

      {message && <div className="inline-notice">{message}</div>}
      {error && <div className="inline-error">{error}</div>}
      {publishBlocked && (
        <div className="inline-notice">Publish at least one chapter below before posting this work.</div>
      )}

      <div className="profile-panel story-edit-grid">
        <section className="profile-card">
          <div className="profile-card-head">
            <h2>Details</h2>
            <p className="field-hint">Title, summary, and cover for your work.</p>
          </div>

          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled work" />
          </label>

          <label>
            Summary
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this story about?"
            />
          </label>

          <div className="field-row">
            <label>
              Shelf / genre
              <input list="genre-options" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Fantasy, Romance…" />
              <datalist id="genre-options">
                {genres.map((g) => (
                  <option key={g.slug} value={g.name} />
                ))}
              </datalist>
            </label>
            <label>
              Language
              <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="English" />
            </label>
          </div>

          <div className="field-group">
            <span className="field-label">Cover image</span>
            <p className="field-hint">Optional — falls back to a colored card if you skip this.</p>
            <div className="story-cover-upload-row">
              <div className="story-cover-preview" style={coverStyle(story)} />
              <div className="avatar-upload-actions">
                <button type="button" className="btn secondary" disabled={uploadingCover} onClick={() => coverInputRef.current?.click()}>
                  {uploadingCover ? 'Uploading…' : story.coverImageUrl ? 'Change cover' : 'Upload cover'}
                </button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={handleCoverUpload}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card-head">
            <h2>Classification</h2>
            <p className="field-hint">Help readers know what to expect before they start.</p>
          </div>

          <div className="option-group">
            <span className="field-label">Rating</span>
            <div className="option-row">
              {RATINGS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`option-btn ${rating === r ? 'active' : ''}`}
                  onClick={() => setRating(r)}
                >
                  {RATING_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div className="field-group">
            <span className="field-label">Content warnings</span>
            <div className="option-row">
              {WARNING_OPTIONS.map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`option-btn ${warnings.includes(w) ? 'active' : ''}`}
                  onClick={() => toggleWarning(w)}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="field-group">
            <span className="field-label">Category</span>
            <div className="option-row">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`option-btn ${categories.includes(c) ? 'active' : ''}`}
                  onClick={() => toggleCategory(c)}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card-head">
            <h2>Tags</h2>
            <p className="field-hint">
              {isFanfiction
                ? 'Fandoms, pairings, characters, and freeform tags help readers find your work.'
                : 'Pairings, characters, and freeform tags help readers find your work. Set the shelf/genre to "Fanfiction" to add fandom tags.'}
            </p>
          </div>

          {isFanfiction && (
            <TagInput category="fandom" label="Fandom" value={fandomTags} onChange={setFandomTags} placeholder="Add a fandom…" />
          )}
          <TagInput
            category="relationship"
            label="Relationships"
            value={relationshipTags}
            onChange={setRelationshipTags}
            placeholder="e.g. Character A/Character B"
          />
          <TagInput category="character" label="Characters" value={characterTags} onChange={setCharacterTags} placeholder="Add a character…" />
          <TagInput category="freeform" label="Additional tags" value={freeformTags} onChange={setFreeformTags} placeholder="Slow burn, angst, fluff…" />
        </section>

        <section className="profile-card">
          <div className="profile-card-head">
            <h2>Collaboration & settings</h2>
          </div>

          <div className="field-group">
            <span className="field-label">Co-authors</span>
            <p className="field-hint">Added immediately by username — no invite step.</p>
            <div className="blocked-tag-input">
              <input
                value={coAuthorInput}
                onChange={(e) => setCoAuthorInput(e.target.value)}
                placeholder="username"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCoAuthor())}
              />
              <button type="button" className="btn secondary" onClick={addCoAuthor}>
                Add
              </button>
            </div>
            {coAuthors.length > 0 && (
              <div className="tag-row">
                {coAuthors.map((name) => (
                  <button key={name} type="button" className="tag-chip active removable" onClick={() => removeCoAuthor(name)}>
                    {name} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="toggle-row">
            <span className="toggle-copy">
              <span className="toggle-label">Mark as complete</span>
              <span className="toggle-hint">Shows a "Complete" badge instead of "In Progress".</span>
            </span>
            <span className="toggle-switch">
              <input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} />
              <span className="toggle-track" aria-hidden />
            </span>
          </label>

          <label className="toggle-row">
            <span className="toggle-copy">
              <span className="toggle-label">Allow comments</span>
              <span className="toggle-hint">Readers can leave comments on this work.</span>
            </span>
            <span className="toggle-switch">
              <input
                type="checkbox"
                checked={commentsEnabled}
                onChange={(e) => setCommentsEnabled(e.target.checked)}
              />
              <span className="toggle-track" aria-hidden />
            </span>
          </label>
        </section>

        <section className="profile-card story-edit-chapters">
          <div className="profile-card-head">
            <h2>Chapters</h2>
            <button type="button" className="btn secondary small-btn" onClick={handleAddChapter}>
              + Add chapter
            </button>
          </div>

          {story.chapters.length === 0 ? (
            <p className="empty-hint">No chapters yet — add your first one to get started.</p>
          ) : (
            <ul className="chapter-manager-list">
              {story.chapters.map((chapter, i) => (
                <li key={chapter.id} className="chapter-manager-row">
                  <div className="chapter-manager-order">
                    <button type="button" disabled={i === 0} onClick={() => handleMoveChapter(i, -1)} aria-label="Move up">
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={i === story.chapters.length - 1}
                      onClick={() => handleMoveChapter(i, 1)}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                  </div>
                  <div className="chapter-manager-body">
                    <p className="chapter-manager-title">
                      Ch. {chapter.number}: {chapter.title}
                    </p>
                    <span className={`status-pill small ${chapter.published ? 'published' : 'draft'}`}>
                      {chapter.published ? 'Posted' : 'Draft'}
                    </span>
                  </div>
                  <div className="chapter-manager-actions">
                    <Link to={`/write/${story.id}/chapters/${chapter.id}`} className="btn secondary small-btn">
                      Edit
                    </Link>
                    <button type="button" className="btn ghost danger small-btn" onClick={() => handleDeleteChapter(chapter)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
