import { Link } from 'react-router-dom'

export default function SignInToReadGate({
  storyTitle,
  backTo,
}: {
  storyTitle?: string
  backTo?: string
}) {
  return (
    <div className="sign-in-read-overlay" role="dialog" aria-modal="true" aria-labelledby="sign-in-read-title">
      <div className="sign-in-read-modal">
        <p className="sign-in-read-tag">Free to join</p>
        <h2 id="sign-in-read-title">Sign in to keep reading</h2>
        <p className="sign-in-read-copy">
          {storyTitle
            ? `Create a free account to read "${storyTitle}" — bookmark chapters, comment, and join the community.`
            : 'Create a free account to read this chapter and save your place.'}
        </p>
        <div className="sign-in-read-actions">
          <Link to="/login" className="btn primary full">
            Get started
          </Link>
          <Link to="/login" className="btn secondary full">
            Log in
          </Link>
          {backTo && (
            <Link to={backTo} className="btn ghost full">
              Back to story
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
