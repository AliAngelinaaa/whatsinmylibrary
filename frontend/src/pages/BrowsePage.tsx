import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, type Genre, type StorySummary, type Tag } from '../api'
import BrowseWorkBlurb, { type CollectionVariant } from '../components/BrowseWorkBlurb'

export type BrowseVariant = CollectionVariant

const VARIANT_CONFIG: Record<
  BrowseVariant,
  {
    title: string
    kicker: string
    subtitle: string
    path: string
    lockedGenre?: string
    excludeGenre?: string
    vipOnly?: boolean
    hideFanfictionGenre?: boolean
    notice?: string
    filterTitle?: string
    genreLegend?: string
    tagLegend?: string
  }
> = {
  browse: {
    title: 'Browse',
    kicker: 'Library',
    subtitle: 'Pick a genre or follow a tag.',
    path: '/browse',
    filterTitle: 'Filters',
    genreLegend: 'Genre',
    tagLegend: 'Tags',
  },
  originals: {
    title: 'Originals',
    kicker: 'The stacks',
    subtitle: 'Books created for this library — original stories, not fanfiction.',
    path: '/originals',
    excludeGenre: 'Fanfiction',
    hideFanfictionGenre: true,
    filterTitle: 'Shelves',
    genreLegend: 'Genre',
    tagLegend: 'Themes',
  },
  fanfics: {
    title: 'Fanfics',
    kicker: 'Any topic',
    subtitle: 'AUs, ships, tropes, and fandoms — pick a topic and go. Free to read.',
    path: '/fanfics',
    lockedGenre: 'Fanfiction',
    hideFanfictionGenre: true,
    notice: 'Fanfiction is free to read and comment on.',
  },
  vip: {
    title: 'VIP',
    kicker: 'Exclusive chapters',
    subtitle: 'Free previews to start. Unlock the rest with coins and support the writer.',
    path: '/vip',
    vipOnly: true,
    notice: 'Use coins from your wallet to unlock VIP chapters.',
    filterTitle: 'Browse',
    genreLegend: 'Genre',
    tagLegend: 'Tags',
  },
}

type SortKey = 'date' | 'title' | 'chapters' | 'words'

type Props = {
  variant?: BrowseVariant
}

export default function BrowsePage({ variant = 'browse' }: Props) {
  const config = VARIANT_CONFIG[variant]
  const [searchParams, setSearchParams] = useSearchParams()
  const [genres, setGenres] = useState<Genre[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [stories, setStories] = useState<StorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeGenre = config.lockedGenre || searchParams.get('genre') || ''
  const activeTags = useMemo(
    () => (searchParams.get('tags') || '').split(',').filter(Boolean),
    [searchParams],
  )
  const searchQuery = searchParams.get('q') || ''
  const sort = (searchParams.get('sort') as SortKey) || 'date'

  const visibleGenres = useMemo(() => {
    if (!config.hideFanfictionGenre) return genres
    return genres.filter((g) => g.name.toLowerCase() !== 'fanfiction')
  }, [genres, config.hideFanfictionGenre])

  const tagName = (slug: string) => tags.find((tag) => tag.slug === slug)?.name || slug

  useEffect(() => {
    Promise.all([api.genres(), api.tags()])
      .then(([g, t]) => {
        setGenres(g)
        setTags(t)
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    api.stories({
      genre: activeGenre || undefined,
      excludeGenre: config.excludeGenre,
      vip: config.vipOnly,
      tags: activeTags.length ? activeTags : undefined,
      q: searchQuery || undefined,
    })
      .then(setStories)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [activeGenre, activeTags, searchQuery, config.excludeGenre, config.vipOnly])

  const sortedStories = useMemo(() => {
    const next = [...stories]
    if (sort === 'title') {
      next.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sort === 'chapters') {
      next.sort((a, b) => b.chapterCount - a.chapterCount)
    } else if (sort === 'words') {
      next.sort((a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0))
    }
    return next
  }, [stories, sort])

  const featuredStory = variant === 'vip' && !loading && !error ? sortedStories[0] : undefined
  const listStories = featuredStory ? sortedStories.slice(1) : sortedStories

  const updateParams = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams)
    mutate(next)
    setSearchParams(next)
  }

  const setGenre = (genre: string) => {
    if (config.lockedGenre) return
    updateParams((next) => {
      if (genre) next.set('genre', genre)
      else next.delete('genre')
    })
  }

  const toggleTag = (slug: string) => {
    updateParams((next) => {
      const current = new Set(activeTags)
      if (current.has(slug)) current.delete(slug)
      else current.add(slug)
      if (current.size) next.set('tags', [...current].join(','))
      else next.delete('tags')
    })
  }

  const setSort = (value: SortKey) => {
    updateParams((next) => {
      if (value === 'date') next.delete('sort')
      else next.set('sort', value)
    })
  }

  const clearSearch = () => {
    updateParams((next) => next.delete('q'))
  }

  const clearFilters = () => {
    setSearchParams({})
  }

  const hasFilters =
    (!config.lockedGenre && !!activeGenre) || activeTags.length > 0 || !!searchQuery

  const resultCount = loading
    ? 'Loading…'
    : variant === 'originals'
      ? `${stories.length} ${stories.length === 1 ? 'book' : 'books'}`
      : `${stories.length} ${stories.length === 1 ? 'story' : 'stories'}`

  const showSidebar = variant !== 'fanfics'
  const listClass =
    variant === 'originals'
      ? 'browse-list shelf-grid'
      : variant === 'fanfics'
        ? 'browse-list topic-grid'
        : variant === 'vip'
          ? 'browse-list vip-grid'
          : 'browse-list'

  return (
    <div className={`browse-page browse-${variant}`}>
      {variant === 'vip' ? (
        <header className="vip-hero">
          <p className="collection-kicker">{config.kicker}</p>
          <h1>{config.title}</h1>
          <p className="browse-scope">{config.subtitle}</p>
        </header>
      ) : variant === 'originals' ? (
        <header className="originals-hero">
          <p className="collection-kicker">{config.kicker}</p>
          <h1>{config.title}</h1>
          <p className="browse-scope">{config.subtitle}</p>
        </header>
      ) : variant === 'fanfics' ? (
        <header className="fanfics-hero">
          <p className="collection-kicker">{config.kicker}</p>
          <h1>{config.title}</h1>
          <p className="browse-scope">{config.subtitle}</p>
        </header>
      ) : (
        <header className="browse-toolbar">
          <div>
            <h1>{config.title}</h1>
            <p className="browse-scope">{config.subtitle}</p>
          </div>
          <button
            type="button"
            className={`browse-filters-toggle ${filtersOpen ? 'active' : ''}`}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            Filters
          </button>
        </header>
      )}

      {showSidebar && variant !== 'browse' && (
        <div className="browse-toolbar collection-toolbar">
          <p className="browse-count">{resultCount}</p>
          <div className="collection-toolbar-actions">
            <label className="browse-sort">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="date">Newest</option>
                <option value="title">Title</option>
                <option value="words">Word count</option>
                <option value="chapters">Chapters</option>
              </select>
            </label>
            <button
              type="button"
              className={`browse-filters-toggle ${filtersOpen ? 'active' : ''}`}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              {config.filterTitle || 'Filters'}
            </button>
          </div>
        </div>
      )}

      {variant === 'fanfics' && (
        <div className="fanfic-topics" aria-label="Browse by topic">
          <div className="fanfic-topics-head">
            <h2>Topics</h2>
            <div className="collection-toolbar-actions">
              <p className="browse-count">{resultCount}</p>
              <label className="browse-sort">
                Sort
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  <option value="date">Newest</option>
                  <option value="title">Title</option>
                  <option value="words">Word count</option>
                  <option value="chapters">Chapters</option>
                </select>
              </label>
            </div>
          </div>
          {tags.length === 0 ? (
            <p className="browse-filter-empty">No topics yet.</p>
          ) : (
            <div className="fanfic-topic-cloud">
              {tags.map((tag) => (
                <button
                  key={tag.slug}
                  type="button"
                  className={`fanfic-topic ${activeTags.includes(tag.slug) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag.slug)}
                >
                  {tag.name}
                  {tag.count != null && <span>{tag.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {config.notice && variant !== 'vip' && (
        <p className="inline-notice browse-notice">{config.notice}</p>
      )}

      {hasFilters && (
        <div className="browse-active-filters">
          <span className="browse-active-label">{variant === 'fanfics' ? 'Topics' : 'Showing'}</span>
          {!config.lockedGenre && activeGenre && (
            <button type="button" className="browse-chip" onClick={() => setGenre('')}>
              {activeGenre} <span aria-hidden>×</span>
            </button>
          )}
          {activeTags.map((slug) => (
            <button key={slug} type="button" className="browse-chip" onClick={() => toggleTag(slug)}>
              {tagName(slug)} <span aria-hidden>×</span>
            </button>
          ))}
          {searchQuery && (
            <button type="button" className="browse-chip" onClick={clearSearch}>
              “{searchQuery}” <span aria-hidden>×</span>
            </button>
          )}
          <button type="button" className="browse-clear" onClick={clearFilters}>
            Clear all
          </button>
        </div>
      )}

      <div className={`browse-layout ${filtersOpen ? 'filters-open' : ''} ${showSidebar ? '' : 'no-sidebar'}`}>
        <div className="browse-results">
          {variant !== 'fanfics' && variant !== 'originals' && variant !== 'vip' && (
            <div className="browse-results-bar">
              <p className="browse-count">{resultCount}</p>
              <label className="browse-sort">
                Sort
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  <option value="date">Newest</option>
                  <option value="title">Title</option>
                  <option value="words">Word count</option>
                  <option value="chapters">Chapters</option>
                </select>
              </label>
            </div>
          )}

          {loading ? (
            <div className="page-state">Loading stories…</div>
          ) : error ? (
            <div className="page-state error">{error}</div>
          ) : sortedStories.length === 0 ? (
            <div className="page-state browse-empty">
              <p>No stories match these filters.</p>
              {hasFilters && (
                <button type="button" className="btn secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {featuredStory && (
                <ol className="vip-featured">
                  <BrowseWorkBlurb
                    story={featuredStory}
                    collectionPath={config.path}
                    variant={variant}
                    featured
                  />
                </ol>
              )}
              {listStories.length > 0 && (
                <ol className={listClass}>
                  {listStories.map((story) => (
                    <BrowseWorkBlurb
                      key={story.id}
                      story={story}
                      collectionPath={config.path}
                      variant={variant}
                    />
                  ))}
                </ol>
              )}
            </>
          )}
        </div>

        {showSidebar && (
          <aside className="browse-filters" aria-label="Filter stories">
            <h2>{config.filterTitle || 'Filters'}</h2>

            {!config.lockedGenre && visibleGenres.length > 0 && (
              <fieldset>
                <legend>{config.genreLegend || 'Genre'}</legend>
                <ul>
                  <li>
                    <label>
                      <input
                        type="radio"
                        name="genre"
                        checked={!activeGenre}
                        onChange={() => setGenre('')}
                      />
                      All genres
                    </label>
                  </li>
                  {visibleGenres.map((genre) => (
                    <li key={genre.slug}>
                      <label>
                        <input
                          type="radio"
                          name="genre"
                          checked={activeGenre === genre.name}
                          onChange={() => setGenre(genre.name)}
                        />
                        {genre.name}
                        <span>({genre.count})</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}

            <fieldset>
              <legend>{config.tagLegend || 'Tags'}</legend>
              {tags.length === 0 ? (
                <p className="browse-filter-empty">No tags yet.</p>
              ) : (
                <ul>
                  {tags.map((tag) => (
                    <li key={tag.slug}>
                      <label>
                        <input
                          type="checkbox"
                          checked={activeTags.includes(tag.slug)}
                          onChange={() => toggleTag(tag.slug)}
                        />
                        {tag.name}
                        {tag.count != null && <span>({tag.count})</span>}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          </aside>
        )}
      </div>
    </div>
  )
}
