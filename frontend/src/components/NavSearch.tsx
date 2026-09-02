import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { MONETIZATION_ENABLED } from '../features'

const COLLECTION_PATHS = ['/browse', '/originals', '/fanfics', ...(MONETIZATION_ENABLED ? ['/vip'] : [])]

export default function NavSearch() {
  const location = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  useEffect(() => {
    setQuery(new URLSearchParams(location.search).get('q') || '')
  }, [location.search])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const target = COLLECTION_PATHS.includes(location.pathname) ? location.pathname : '/browse'
    const next = COLLECTION_PATHS.includes(location.pathname)
      ? new URLSearchParams(location.search)
      : new URLSearchParams()
    const trimmed = query.trim()
    if (trimmed) next.set('q', trimmed)
    else next.delete('q')
    const qs = next.toString()
    navigate(`${target}${qs ? `?${qs}` : ''}`)
  }

  return (
    <form className="nav-search" onSubmit={submit} role="search">
      <label className="sr-only" htmlFor="nav-search">
        Search stories
      </label>
      <input
        id="nav-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search stories"
        type="search"
      />
      <button type="submit" className="btn primary nav-search-btn" aria-label="Search">
        Search
      </button>
    </form>
  )
}
