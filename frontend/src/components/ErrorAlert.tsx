import { useEffect } from 'react'

function sentenceCase(message: string) {
  const trimmed = message.trim()
  if (!trimmed) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export default function ErrorAlert({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="error-alert-backdrop" role="presentation" onClick={onClose}>
      <div
        className="error-alert"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-alert-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="error-alert-title">Couldn’t post</h2>
        <p>{sentenceCase(message)}</p>
        <button type="button" className="btn primary" onClick={onClose} autoFocus>
          OK
        </button>
      </div>
    </div>
  )
}
