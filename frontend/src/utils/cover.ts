import type { CSSProperties } from 'react'

/** Shared cover-art style: use a real cover image when present, else the flat color swatch. */
export function coverStyle(story: { coverColor: string; coverImageUrl?: string }): CSSProperties {
  if (story.coverImageUrl) {
    return {
      backgroundImage: `url(${story.coverImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  return { background: story.coverColor }
}
