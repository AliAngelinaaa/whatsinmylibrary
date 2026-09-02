import { useEffect, useRef, useState } from 'react'
import { api, type Tag, type TagCategory } from '../api'

export default function TagInput({
  category,
  value,
  onChange,
  placeholder,
  label,
}: {
  category: TagCategory
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  label?: string
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length === 0) {
      setSuggestions([])
      return
    }
    let cancelled = false
    const timeout = setTimeout(() => {
      api
        .tagSuggestions({ category, q })
        .then((tags) => {
          if (!cancelled) setSuggestions(tags.filter((t) => !value.includes(t.name)))
        })
        .catch(() => {
          if (!cancelled) setSuggestions([])
        })
    }, 180)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [query, category, value])

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  const addTag = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setQuery('')
      return
    }
    onChange([...value, trimmed])
    setQuery('')
    setSuggestions([])
    setOpen(false)
    setHighlighted(0)
  }

  const removeTag = (name: string) => {
    onChange(value.filter((v) => v !== name))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && query.trim()) {
      e.preventDefault()
      if (open && suggestions[highlighted]) {
        addTag(suggestions[highlighted].name)
      } else {
        addTag(query)
      }
      return
    }
    if (e.key === 'Backspace' && !query && value.length > 0) {
      removeTag(value[value.length - 1])
      return
    }
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault()
      setHighlighted((h) => (h + 1) % suggestions.length)
    }
    if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault()
      setHighlighted((h) => (h - 1 + suggestions.length) % suggestions.length)
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="tag-input-field" ref={wrapRef}>
      {label && <label className="tag-input-label">{label}</label>}
      <div className="tag-input-shell">
        {value.map((name) => (
          <span key={name} className="tag-chip removable">
            {name}
            <button type="button" aria-label={`Remove ${name}`} onClick={() => removeTag(name)}>
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlighted(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul className="tag-input-suggestions" role="listbox">
          {suggestions.map((tag, i) => (
            <li key={tag.id}>
              <button
                type="button"
                className={i === highlighted ? 'active' : ''}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(tag.name)}
              >
                {tag.name}
                {tag.count ? <span className="tag-input-count">{tag.count}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
