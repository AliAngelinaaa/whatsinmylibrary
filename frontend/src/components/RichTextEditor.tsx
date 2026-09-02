import { useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'

type Mode = 'rich' | 'html'

function ToolbarButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean
  disabled?: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`rte-btn ${active ? 'active' : ''}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const [mode, setMode] = useState<Mode>('rich')
  const [htmlDraft, setHtmlDraft] = useState(value)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'rte-content',
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    setHtmlDraft(value)
  }, [value])

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  if (!editor) return null

  const switchToHtml = () => {
    setHtmlDraft(editor.getHTML())
    setMode('html')
  }

  const switchToRich = () => {
    editor.commands.setContent(htmlDraft || '', { emitUpdate: false })
    onChange(htmlDraft)
    setMode('rich')
  }

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="rte-wrap">
      <div className="rte-toolbar">
        <div className="rte-toolbar-group">
          <ToolbarButton label="Bold" active={editor.isActive('bold')} disabled={mode === 'html'} onClick={() => editor.chain().focus().toggleBold().run()}>
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton label="Italic" active={editor.isActive('italic')} disabled={mode === 'html'} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton label="Underline" active={editor.isActive('underline')} disabled={mode === 'html'} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <span style={{ textDecoration: 'underline' }}>U</span>
          </ToolbarButton>
          <ToolbarButton label="Strikethrough" active={editor.isActive('strike')} disabled={mode === 'html'} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <span style={{ textDecoration: 'line-through' }}>S</span>
          </ToolbarButton>
        </div>
        <div className="rte-toolbar-group">
          <ToolbarButton label="Heading 2" active={editor.isActive('heading', { level: 2 })} disabled={mode === 'html'} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            H2
          </ToolbarButton>
          <ToolbarButton label="Heading 3" active={editor.isActive('heading', { level: 3 })} disabled={mode === 'html'} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            H3
          </ToolbarButton>
          <ToolbarButton label="Blockquote" active={editor.isActive('blockquote')} disabled={mode === 'html'} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            “”
          </ToolbarButton>
          <ToolbarButton label="Horizontal rule" disabled={mode === 'html'} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            ―
          </ToolbarButton>
        </div>
        <div className="rte-toolbar-group">
          <ToolbarButton label="Bullet list" active={editor.isActive('bulletList')} disabled={mode === 'html'} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            •&nbsp;list
          </ToolbarButton>
          <ToolbarButton label="Numbered list" active={editor.isActive('orderedList')} disabled={mode === 'html'} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            1.&nbsp;list
          </ToolbarButton>
          <ToolbarButton label="Link" active={editor.isActive('link')} disabled={mode === 'html'} onClick={setLink}>
            🔗
          </ToolbarButton>
        </div>
        <div className="rte-toolbar-group">
          <ToolbarButton label="Undo" disabled={mode === 'html'} onClick={() => editor.chain().focus().undo().run()}>
            ↺
          </ToolbarButton>
          <ToolbarButton label="Redo" disabled={mode === 'html'} onClick={() => editor.chain().focus().redo().run()}>
            ↻
          </ToolbarButton>
        </div>
        <div className="rte-toolbar-group rte-toolbar-mode">
          <button type="button" className={`rte-mode-btn ${mode === 'rich' ? 'active' : ''}`} onClick={switchToRich}>
            Rich text
          </button>
          <button type="button" className={`rte-mode-btn ${mode === 'html' ? 'active' : ''}`} onClick={switchToHtml}>
            HTML
          </button>
        </div>
      </div>

      {mode === 'rich' ? (
        <EditorContent editor={editor} />
      ) : (
        <textarea
          className="rte-html-textarea"
          value={htmlDraft}
          onChange={(e) => {
            setHtmlDraft(e.target.value)
            onChange(e.target.value)
          }}
          placeholder={placeholder}
          spellCheck={false}
        />
      )}
    </div>
  )
}
