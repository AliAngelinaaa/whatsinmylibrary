/** Splits chapter HTML into top-level block elements (one per "paragraph index"). */
export function splitContentBlocks(html: string): string[] {
  if (!html) return []
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return Array.from(doc.body.children).map((el) => el.outerHTML)
}

/** Strips tags for decorative/plain-text contexts (e.g. the blurred guest preview). */
export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

/**
 * Wraps the text in [start, end) (offsets measured against the container's
 * concatenated textContent, in DOM order) with elements created by
 * `makeWrapper`. Handles ranges that span multiple text nodes/inline tags by
 * wrapping each intersecting text node segment individually — the wrappers
 * render back-to-back so the highlight still looks continuous.
 */
export function highlightRangeInContainer(
  container: HTMLElement,
  start: number,
  end: number,
  makeWrapper: () => HTMLElement,
) {
  if (end <= start) return

  const textNodes: Text[] = []
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let n: Node | null
  while ((n = walker.nextNode())) {
    textNodes.push(n as Text)
  }

  let cursor = 0
  for (const textNode of textNodes) {
    const nodeLen = textNode.textContent?.length ?? 0
    const nodeStart = cursor
    const nodeEnd = cursor + nodeLen
    cursor = nodeEnd
    if (nodeEnd <= start || nodeStart >= end) continue

    const localStart = Math.max(0, start - nodeStart)
    const localEnd = Math.min(nodeLen, end - nodeStart)
    if (localStart >= localEnd) continue

    let target: Text = textNode
    if (localEnd < nodeLen) {
      target = target.splitText(localStart)
      target.splitText(localEnd - localStart)
    } else if (localStart > 0) {
      target = target.splitText(localStart)
    }

    const wrapper = makeWrapper()
    target.parentNode?.insertBefore(wrapper, target)
    wrapper.appendChild(target)
  }
}
