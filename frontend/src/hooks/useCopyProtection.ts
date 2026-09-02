import { useEffect, type RefObject } from 'react'

export const COPY_NOTICE =
  'Story text cannot be copied from this site. Read and support authors here.'

export function useCopyProtection<T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled = true,
) {
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      e.clipboardData?.setData('text/plain', COPY_NOTICE)
    }

    const onCut = (e: ClipboardEvent) => {
      e.preventDefault()
    }

    const onContextMenu = (e: Event) => {
      e.preventDefault()
    }

    const onDragStart = (e: DragEvent) => {
      e.preventDefault()
    }

    el.addEventListener('copy', onCopy)
    el.addEventListener('cut', onCut)
    el.addEventListener('contextmenu', onContextMenu)
    el.addEventListener('dragstart', onDragStart)

    return () => {
      el.removeEventListener('copy', onCopy)
      el.removeEventListener('cut', onCut)
      el.removeEventListener('contextmenu', onContextMenu)
      el.removeEventListener('dragstart', onDragStart)
    }
  }, [ref, enabled])
}
