import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type ChapterDetail, type LineComment, type StoryDetail } from '../api'
import { useAuth } from '../AuthContext'
import InlineCommentPanel from '../components/InlineCommentPanel'
import SignInToReadGate from '../components/SignInToReadGate'
import { MONETIZATION_ENABLED } from '../features'
import { COPY_NOTICE, useCopyProtection } from '../hooks/useCopyProtection'
import { highlightRangeInContainer, htmlToText, splitContentBlocks } from '../utils/richContent'

type SelectionState = {
  paragraphIdx: number
  startOffset: number
  endOffset: number
  selectedText: string
}

function ReaderParagraph({
  index,
  html,
  comments,
  activeCommentId,
  onSelect,
  onHighlightClick,
}: {
  index: number
  html: string
  comments: LineComment[]
  activeCommentId: number | null
  onSelect: (paragraphIdx: number) => void
  onHighlightClick: (commentId: number, paraIdx: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = html

    const ranges = comments
      .filter((c) => c.startOffset >= 0 && c.endOffset > c.startOffset)
      .sort((a, b) => a.startOffset - b.startOffset)

    for (const c of ranges) {
      highlightRangeInContainer(el, c.startOffset, c.endOffset, () => {
        const mark = document.createElement('mark')
        mark.className = `inline-highlight ${activeCommentId === c.id ? 'active' : ''}`
        mark.dataset.commentId = String(c.id)
        return mark
      })
    }
  }, [html, comments, activeCommentId])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const markEl = target.closest('mark[data-comment-id]') as HTMLElement | null
    if (markEl?.dataset.commentId) {
      e.stopPropagation()
      onHighlightClick(Number(markEl.dataset.commentId), index)
    }
  }

  return (
    <div
      ref={ref}
      data-para={index}
      className="reader-para-text reader-block"
      onMouseUp={() => onSelect(index)}
      onClick={handleClick}
    />
  )
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
  const [tocOpen, setTocOpen] = useState(false)

  const storyId = Number(id)
  const chapterNum = Number(num)

  const theme = user?.readerTheme || 'light'
  const fontSize = user?.readerFontSize || 'md'
  const font = user?.readerFont || 'serif'

  const contentBlocks = useMemo(() => splitContentBlocks(chapter?.content ?? ''), [chapter?.content])

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
      if (!target.closest('.toc-menu')) {
        setTocOpen(false)
      }
    }
    document.addEventListener('mousedown', closeOnClickOutside)
    return () => document.removeEventListener('mousedown', closeOnClickOutside)
  }, [])

  useEffect(() => {
    setTocOpen(false)
  }, [chapterNum])

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

    const paraText = htmlToText(contentBlocks[paraIdx] ?? '')
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
  const previewBlocks = guestMode ? contentBlocks.slice(0, 5) : contentBlocks

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

        <div className={`toc-menu ${tocOpen ? 'open' : ''}`}>
          <button
            type="button"
            className="reader-meta toc-trigger"
            onClick={() => setTocOpen((v) => !v)}
            aria-expanded={tocOpen}
            aria-haspopup="listbox"
          >
            <span className="toc-icon" aria-hidden>☰</span>
            {story.title} · Ch. {chapter.number}
            <span className="toc-chevron" aria-hidden>▾</span>
          </button>
          <div className="toc-dropdown" role="listbox" aria-label="Table of contents">
            <p className="toc-dropdown-title">{story.title}</p>
            <ul className="toc-list">
              {story.chapters.map((c) => {
                const isCurrent = c.number === chapterNum
                const isLocked = MONETIZATION_ENABLED && c.locked && !c.unlocked
                return (
                  <li key={c.id}>
                    <Link
                      to={`/story/${storyId}/read/${c.number}`}
                      className={`toc-item ${isCurrent ? 'active' : ''}`}
                      aria-current={isCurrent ? 'true' : undefined}
                      onClick={() => setTocOpen(false)}
                    >
                      <span className="toc-item-num">{c.number}.</span>
                      <span className="toc-item-title">{c.title || `Chapter ${c.number}`}</span>
                      {isLocked && <span className="toc-item-lock" aria-hidden>◎</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

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
                {previewBlocks.length > 0 ? (
                  previewBlocks.map((block, i) => (
                    <p key={i} className="reader-para-text reader-blurred-para">
                      {htmlToText(block)}
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
              {(chapter.summary || chapter.notes) && (
                <div className="chapter-note-block chapter-notes">
                  {chapter.summary && (
                    <p>
                      <strong>Summary:</strong> {chapter.summary}
                    </p>
                  )}
                  {chapter.notes && <p>{chapter.notes}</p>}
                </div>
              )}
              <p className="inline-reading-hint muted">
                Hover a paragraph and tap the bubble to comment · highlight text to comment on a specific phrase
              </p>
              {contentBlocks.map((block, i) => {
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
                    <ReaderParagraph
                      index={i}
                      html={block}
                      comments={paraComments}
                      activeCommentId={activeCommentId}
                      onSelect={handleTextSelect}
                      onHighlightClick={openCommentHighlight}
                    />

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
              {chapter.endNotes && (
                <div className="chapter-note-block chapter-end-notes">
                  <p>{chapter.endNotes}</p>
                </div>
              )}
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
