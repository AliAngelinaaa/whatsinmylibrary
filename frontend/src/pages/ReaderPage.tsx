import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type ChapterDetail, type LineComment, type StoryDetail } from '../api'
import { useAuth } from '../AuthContext'
import InlineCommentPanel from '../components/InlineCommentPanel'
import SignInToReadGate from '../components/SignInToReadGate'
import { MONETIZATION_ENABLED } from '../features'
import { COPY_NOTICE, useCopyProtection } from '../hooks/useCopyProtection'

type SelectionState = {
  paragraphIdx: number
  startOffset: number
  endOffset: number
  selectedText: string
}

function renderParagraphText(
  text: string,
  comments: LineComment[],
  activeCommentId: number | null,
  onHighlightClick: (commentId: number, paraIdx: number) => void,
  paraIdx: number,
) {
  if (comments.length === 0) return text

  const ranges = [...comments]
    .filter((c) => c.startOffset >= 0 && c.endOffset > c.startOffset)
    .sort((a, b) => a.startOffset - b.startOffset)

  if (ranges.length === 0) return text

  const parts: ReactNode[] = []
  let cursor = 0

  for (const c of ranges) {
    const start = Math.max(c.startOffset, cursor)
    const end = Math.min(c.endOffset, text.length)
    if (start > cursor) {
      parts.push(text.slice(cursor, start))
    }
    if (end > start) {
      parts.push(
        <mark
          key={c.id}
          className={`inline-highlight ${activeCommentId === c.id ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onHighlightClick(c.id, paraIdx)
          }}
        >
          {text.slice(start, end)}
        </mark>,
      )
      cursor = end
    }
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor))
  }

  return parts
}

export default function ReaderPage() {
  const { id, num } = useParams()
  const navigate = useNavigate()
  const { user, refreshUser, loading: authLoading } = useAuth()
  const articleRef = useRef<HTMLElement>(null)

  const [story, setStory] = useState<StoryDetail | null>(null)
  const [chapter, setChapter] = useState<ChapterDetail | null>(null)
  const [lineComments, setLineComments] = useState<LineComment[]>([])
  const [loading, setLoading] = useState(true)
  const [unlocking, setUnlocking] = useState(false)
  const [selection, setSelection] = useState<SelectionState | null>(null)
  const [activePara, setActivePara] = useState<number | null>(null)
  const [hoveredPara, setHoveredPara] = useState<number | null>(null)
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null)

  const storyId = Number(id)
  const chapterNum = Number(num)

  const theme = user?.readerTheme || 'light'
  const fontSize = user?.readerFontSize || 'md'
  const font = user?.readerFont || 'serif'

  const paragraphs = chapter?.content?.split('\n\n') ?? []

  useCopyProtection(articleRef, !!chapter && !chapter.locked && !!user)

  useEffect(() => {
    Promise.all([api.story(storyId), api.chapter(storyId, chapterNum)])
      .then(([s, c]) => {
        setStory(s)
        setChapter(c)
        if (!c.locked && user) {
          api.lineComments(c.id).then(setLineComments)
        } else {
          setLineComments([])
        }
      })
      .finally(() => setLoading(false))
  }, [storyId, chapterNum, user])

  useEffect(() => {
    const closeOnClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        !target.closest('.inline-comment-panel') &&
        !target.closest('.inline-comment-bubble') &&
        !target.closest('.inline-selection-toolbar')
      ) {
        setActivePara(null)
        setSelection(null)
        setActiveCommentId(null)
      }
    }
    document.addEventListener('mousedown', closeOnClickOutside)
    return () => document.removeEventListener('mousedown', closeOnClickOutside)
  }, [])

  const unlock = async () => {
    if (!chapter || !user) {
      navigate('/login')
      return
    }
    setUnlocking(true)
    try {
      await api.unlockChapter(chapter.id)
      await refreshUser()
      const unlocked = await api.chapter(storyId, chapterNum)
      setChapter(unlocked)
      const comments = await api.lineComments(unlocked.id)
      setLineComments(comments)
    } finally {
      setUnlocking(false)
    }
  }

  const commentsForPara = (idx: number) =>
    lineComments.filter((c) => c.paragraphIdx === idx)

  const handleTextSelect = (paragraphIdx: number) => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      return
    }

    const paraEl = articleRef.current?.querySelector(`[data-para="${paragraphIdx}"]`)
    if (!paraEl || !sel.anchorNode || !sel.focusNode) return
    if (!paraEl.contains(sel.anchorNode) || !paraEl.contains(sel.focusNode)) return

    const selectedText = sel.toString()
    const range = sel.getRangeAt(0)
    const preRange = document.createRange()
    preRange.selectNodeContents(paraEl)
    preRange.setEnd(range.startContainer, range.startOffset)
    const startOffset = preRange.toString().length
    const endOffset = startOffset + selectedText.length

    setSelection({ paragraphIdx, startOffset, endOffset, selectedText })
    setActivePara(paragraphIdx)
  }

  const openParaComments = (paraIdx: number) => {
    setActivePara(activePara === paraIdx ? null : paraIdx)
    setSelection(null)
    setActiveCommentId(null)
    window.getSelection()?.removeAllRanges()
  }

  const openCommentHighlight = (commentId: number, paraIdx: number) => {
    setActiveCommentId(commentId)
    setActivePara(paraIdx)
  }

  const postLineComment = async (body: string) => {
    if (!user) {
      navigate('/login')
      throw new Error('Unauthorized')
    }
    if (!chapter) throw new Error('Chapter not loaded')

    const paraIdx = selection?.paragraphIdx ?? activePara
    if (paraIdx == null) throw new Error('No active paragraph selected')

    const paraText = paragraphs[paraIdx] ?? ''
    const hasSelection = selection && selection.paragraphIdx === paraIdx

    const payload = hasSelection
      ? {
          body,
          paragraphIdx: selection.paragraphIdx,
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
          selectedText: selection.selectedText,
        }
      : {
          body,
          paragraphIdx: paraIdx,
          startOffset: 0,
          endOffset: paraText.length > 0 ? paraText.length : 0, // Ensure endOffset is valid for empty/short paras
          selectedText: paraText.slice(0, 120),
        }

    const comment = await api.postLineComment(chapter.id, payload)
    setLineComments((prev) => [...prev, comment])
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }

  if (loading || authLoading) return <div className="page-state">Loading chapter…</div>
  if (!story || !chapter) return <div className="page-state error">Chapter not found</div>

  const guestMode = !user
  const canReadFull = !!user && !chapter.locked
  const previewParagraphs = guestMode ? paragraphs.slice(0, 5) : paragraphs

  const prev = chapterNum > 1 ? chapterNum - 1 : null
  const next =
    canReadFull && story.chapters.some((c) => c.number === chapterNum + 1)
      ? chapterNum + 1
      : null

  return (
    <div className={`reader-page wattpad-inline theme-${theme} size-${fontSize} font-${font}`}>
      <div className="reader-toolbar">
        <Link to={`/story/${storyId}`} className="btn ghost">
          ← Back to story
        </Link>
        <span className="reader-meta">
          {story.title} · Ch. {chapter.number}
        </span>
        {user && (
          <Link to="/profile" className="btn ghost">
            Reader settings
          </Link>
        )}
      </div>

      <div className={`reader-main-grid ${!canReadFull ? 'no-rail' : ''}`}>
        {canReadFull && (
          <aside className="reader-copy-notice" aria-label="Copy policy">
            <p>{COPY_NOTICE}</p>
          </aside>
        )}
        <article
          className={`reader-article wattpad-reader protected-content ${guestMode ? 'reader-guest-preview' : ''}`}
          ref={articleRef}
        >
          <h1>{chapter.title}</h1>

          {guestMode ? (
            <div className="reader-guest-wrap">
              <div className="reader-guest-blur" aria-hidden>
                {previewParagraphs.length > 0 ? (
                  previewParagraphs.map((para, i) => (
                    <p key={i} className="reader-para-text reader-blurred-para">
                      {para}
                    </p>
                  ))
                ) : (
                  <p className="reader-para-text reader-blurred-para">
                    The chapter begins here — sign in to read the rest.
                  </p>
                )}
              </div>
              <SignInToReadGate storyTitle={story.title} backTo={`/story/${storyId}`} />
            </div>
          ) : chapter.locked ? (
            <div className="lock-panel">
              {MONETIZATION_ENABLED ? (
                <>
                  <div className="lock-icon">◎</div>
                  <h2>VIP Chapter</h2>
                  <p>Unlock this chapter for <strong>{chapter.coinCost} coins</strong>.</p>
                  {!user ? (
                    <Link to="/login" className="btn primary">Sign in to unlock</Link>
                  ) : (user.coins ?? 0) < chapter.coinCost ? (
                    <>
                      <p className="muted">You have {user.coins} coins — need {chapter.coinCost - user.coins} more.</p>
                      <Link to="/wallet" className="btn primary">Buy coins</Link>
                    </>
                  ) : (
                    <button className="btn primary" onClick={unlock} disabled={unlocking}>
                      {unlocking ? 'Unlocking…' : `Unlock for ${chapter.coinCost} coins`}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <h2>Coming soon</h2>
                  <p className="muted">This chapter isn&apos;t available yet. Check back later or read the earlier chapters.</p>
                  <Link to={`/story/${storyId}`} className="btn secondary">Back to chapter list</Link>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="inline-reading-hint muted">
                Hover a paragraph and tap the bubble to comment · highlight text to comment on a specific phrase
              </p>
              {paragraphs.map((para, i) => {
                const paraComments = commentsForPara(i)
                const count = paraComments.length
                const showBubble = count > 0 || hoveredPara === i || activePara === i

                return (
                  <div
                    key={i}
                    className={`reader-para-row ${activePara === i ? 'panel-open' : ''}`}
                    onMouseEnter={() => setHoveredPara(i)}
                    onMouseLeave={() => setHoveredPara(null)}
                  >
                    <p
                      data-para={i}
                      className="reader-para-text"
                      onMouseUp={() => handleTextSelect(i)}
                    >
                      {renderParagraphText(para, paraComments, activeCommentId, openCommentHighlight, i)}
                    </p>

                    <div className="inline-comment-rail">
                      <button
                        type="button"
                        className={`inline-comment-bubble ${count > 0 ? 'has-comments' : ''} ${activePara === i ? 'active' : ''}`}
                        style={{ opacity: showBubble ? 1 : 0, pointerEvents: showBubble ? 'auto' : 'none' }}
                        onClick={() => openParaComments(i)}
                        aria-label={`${count} comments on this paragraph`}
                      >
                        <span className="bubble-icon">💬</span>
                        {count > 0 && <span className="bubble-count">{count}</span>}
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </article>

        {activePara !== null && canReadFull && (
          <>
            <div
              className="inline-comment-backdrop"
              onClick={() => {
                setActivePara(null)
                setSelection(null)
                setActiveCommentId(null)
              }}
            />
            <aside className="inline-comment-sidebar">
              <InlineCommentPanel
                comments={commentsForPara(activePara)}
                selectionQuote={selection?.paragraphIdx === activePara ? selection.selectedText : undefined}
                canPost={!!user}
                onClose={() => {
                  setActivePara(null)
                  setSelection(null)
                  setActiveCommentId(null)
                }}
                onPost={postLineComment}
              />
            </aside>
          </>
        )}
      </div>

      <div className="reader-nav">
        {prev && canReadFull ? (
          <Link to={`/story/${storyId}/read/${prev}`} className="btn secondary">← Previous</Link>
        ) : <span />}
        {next ? (
          <Link to={`/story/${storyId}/read/${next}`} className="btn secondary">Next →</Link>
        ) : guestMode ? (
          <Link to="/login" className="btn primary">Sign in for next chapter</Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
