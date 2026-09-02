import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { api, type Genre, type User, type UserHistory } from '../api'
import { useAuth } from '../AuthContext'
import { MONETIZATION_ENABLED } from '../features'
import { usePrefs, type SiteTheme, type UiFont, type UiScale } from '../PrefsContext'
import Avatar, { userProfilePath } from '../components/Avatar'

const AVATAR_COLORS = ['#957DAD', '#D291BC', '#E0BBE4', '#FEC8D8', '#7d6596', '#b87da8', '#c4a0c8', '#a86b94']
const THEMES = [
  { id: 'light', label: 'Light', hint: 'Clean white page' },
  { id: 'sepia', label: 'Sepia', hint: 'Easy on the eyes' },
  { id: 'dark', label: 'Dark', hint: 'Night reading' },
  { id: 'high-contrast', label: 'High contrast', hint: 'Stronger text and edges' },
] as const
const FONT_SIZES = [
  { id: 'sm', label: 'Small' },
  { id: 'md', label: 'Medium' },
  { id: 'lg', label: 'Large' },
  { id: 'xl', label: 'Extra large' },
] as const
const FONTS = [
  { id: 'serif', label: 'Serif' },
  { id: 'sans', label: 'Sans' },
] as const
const UI_SCALES = [
  { id: 'sm', label: 'Small' },
  { id: 'md', label: 'Default' },
  { id: 'lg', label: 'Large' },
  { id: 'xl', label: 'Extra large' },
] as const
const SITE_THEMES = [
  { id: 'default', label: 'Blush', hint: 'Soft pink and plum' },
  { id: 'cream', label: 'Cream', hint: 'Warm paper' },
  { id: 'dusk', label: 'Dusk', hint: 'Dim purple' },
  { id: 'contrast', label: 'High contrast', hint: 'Dark text, bright pages' },
] as const
const UI_FONTS = [
  { id: 'sans', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'dyslexic', label: 'Readable' },
] as const

const TABS = [
  { id: 'profile', label: 'Profile', hint: 'How others see you' },
  { id: 'reading', label: 'Display', hint: 'Size, color, and reading' },
  { id: 'notifications', label: 'Notifications', hint: 'What we tell you about' },
  { id: 'history', label: 'History', hint: 'Where you left off' },
] as const

type TabId = (typeof TABS)[number]['id']
type HistorySection = 'reading' | 'unlocks' | 'tips'

function formatWhen(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function profileFormFromUser(user: User): Partial<User> {
  return {
    fullName: user.fullName,
    username: user.username,
    bio: user.bio,
    avatarColor: user.avatarColor,
    favoriteGenres: [...(user.favoriteGenres || [])],
    blockedTags: [...(user.blockedTags || [])],
    readerTheme: user.readerTheme || 'light',
    readerFontSize: user.readerFontSize || 'md',
    readerFont: user.readerFont || 'serif',
    uiScale: user.uiScale || 'md',
    siteTheme: user.siteTheme || 'default',
    uiFont: user.uiFont || 'sans',
    reduceMotion: user.reduceMotion ?? false,
    notifyNewChapters: user.notifyNewChapters ?? true,
    notifyReplies: user.notifyReplies ?? true,
    notifyForum: user.notifyForum ?? true,
    notifyTips: user.notifyTips ?? true,
    emailDigest: user.emailDigest ?? false,
  }
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="toggle-row">
      <span className="toggle-copy">
        <span className="toggle-label">{label}</span>
        <span className="toggle-hint">{hint}</span>
      </span>
      <span className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-track" aria-hidden />
      </span>
    </label>
  )
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { prefs, setPrefs } = usePrefs()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as TabId) || 'profile'
  const validTab = TABS.some((t) => t.id === activeTab) ? activeTab : 'profile'

  const [genres, setGenres] = useState<Genre[]>([])
  const [form, setForm] = useState<Partial<User>>({})
  const [blockedInput, setBlockedInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [history, setHistory] = useState<UserHistory | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historySection, setHistorySection] = useState<HistorySection>('reading')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.genres().then(setGenres).catch(() => {})
  }, [])

  useEffect(() => {
    if (user) setForm(profileFormFromUser(user))
  }, [user])

  useEffect(() => {
    if (validTab !== 'history' || !user) return
    setHistoryLoading(true)
    api.userHistory()
      .then(setHistory)
      .catch(() => setHistory({ reading: [], unlocks: [], tips: [] }))
      .finally(() => setHistoryLoading(false))
  }, [validTab, user])

  const dirty = useMemo(() => {
    if (!user) return false
    const baseline = profileFormFromUser(user)
    return JSON.stringify(form) !== JSON.stringify(baseline)
  }, [user, form])

  if (!user) return <Navigate to="/login" replace />

  const setTab = (tab: TabId) => {
    setSearchParams(tab === 'profile' ? {} : { tab }, { replace: true })
    setMessage('')
    setError('')
  }

  const toggleGenre = (name: string) => {
    const current = new Set(form.favoriteGenres || [])
    if (current.has(name)) current.delete(name)
    else current.add(name)
    setForm({ ...form, favoriteGenres: [...current] })
  }

  const addBlockedTag = () => {
    const slug = blockedInput.trim().toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')
    if (!slug) return
    const current = new Set(form.blockedTags || [])
    current.add(slug)
    setForm({ ...form, blockedTags: [...current] })
    setBlockedInput('')
  }

  const removeBlockedTag = (slug: string) => {
    setForm({
      ...form,
      blockedTags: (form.blockedTags || []).filter((tag) => tag !== slug),
    })
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await api.updateProfile({
        fullName: form.fullName,
        username: form.username,
        bio: form.bio,
        avatarColor: form.avatarColor,
        favoriteGenres: form.favoriteGenres,
        blockedTags: form.blockedTags,
        readerTheme: form.readerTheme,
        readerFontSize: form.readerFontSize,
        readerFont: form.readerFont,
        uiScale: form.uiScale,
        siteTheme: form.siteTheme,
        uiFont: form.uiFont,
        reduceMotion: form.reduceMotion,
        notifyNewChapters: form.notifyNewChapters,
        notifyReplies: form.notifyReplies,
        notifyForum: form.notifyForum,
        notifyTips: form.notifyTips,
        emailDigest: form.emailDigest,
      })
      await refreshUser()
      setMessage('Settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const discard = () => {
    if (user) setForm(profileFormFromUser(user))
    setMessage('')
    setError('')
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    setMessage('')
    setError('')
    try {
      await api.uploadAvatar(file)
      await refreshUser()
      setMessage('Profile photo updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  const removeAvatar = async () => {
    setUploadingAvatar(true)
    setMessage('')
    setError('')
    try {
      await api.updateProfile({ avatarUrl: '' })
      await refreshUser()
      setMessage('Profile photo removed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBanner(true)
    setMessage('')
    setError('')
    try {
      await api.uploadBanner(file)
      await refreshUser()
      setMessage('Profile banner updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Banner upload failed')
    } finally {
      setUploadingBanner(false)
      e.target.value = ''
    }
  }

  const removeBanner = async () => {
    setUploadingBanner(true)
    setMessage('')
    setError('')
    try {
      await api.updateProfile({ bannerUrl: '' })
      await refreshUser()
      setMessage('Profile banner removed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setUploadingBanner(false)
    }
  }

  const showSaveBar = dirty && validTab !== 'history'
  const displayUser = {
    fullName: form.fullName || user.fullName,
    username: form.username || user.username,
    avatarColor: form.avatarColor || user.avatarColor,
    avatarUrl: user.avatarUrl,
  }
  const publicPath = userProfilePath(displayUser)

  return (
    <div className="profile-page">
      <section className="profile-header">
        <Avatar user={displayUser} size="xl" className="profile-avatar" />
        <div className="profile-header-copy">
          <p className="eyebrow">Account & settings</p>
          <h1>{form.fullName || user.fullName}</h1>
          <p className="hero-copy">
            Manage your public profile, reading experience, notifications, and activity history.
          </p>
          <div className="profile-quick-stats">
            {MONETIZATION_ENABLED && (
              <Link to="/wallet" className="profile-stat">
                <span className="profile-stat-value">◎ {user.coins}</span>
                <span className="profile-stat-label">Coins</span>
              </Link>
            )}
            {publicPath ? (
              <Link to={publicPath} className="profile-stat profile-stat-link">
                <span className="profile-stat-value">@{displayUser.username}</span>
                <span className="profile-stat-label">View public profile</span>
              </Link>
            ) : (
              <span className="profile-stat">
                <span className="profile-stat-value">No username yet</span>
                <span className="profile-stat-label">Set one below to publish your page</span>
              </span>
            )}
            <span className="profile-stat">
              <span className="profile-stat-value">{user.email}</span>
              <span className="profile-stat-label">Signed in via {user.provider}</span>
            </span>
          </div>
        </div>
      </section>

      <nav className="profile-tabs" aria-label="Profile sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`profile-tab ${validTab === tab.id ? 'active' : ''}`}
            onClick={() => setTab(tab.id)}
          >
            <span className="profile-tab-label">{tab.label}</span>
            <span className="profile-tab-hint">{tab.hint}</span>
          </button>
        ))}
      </nav>

      {message && <div className="inline-notice">{message}</div>}
      {error && <div className="inline-error">{error}</div>}

      {validTab === 'profile' && (
        <div className="profile-panel">
          <section className="profile-card">
            <div className="profile-card-head">
              <h2>Public profile</h2>
              <p className="field-hint">This is how your name and avatar appear on comments and forum posts.</p>
              {publicPath && (
                <Link to={publicPath} className="btn secondary small-btn">
                  View your page
                </Link>
              )}
            </div>

            <label>
              Display name
              <input
                value={form.fullName || ''}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Your name"
              />
            </label>
            <label>
              Username
              <input
                value={form.username || ''}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="mirachen"
              />
              <span className="field-hint">Unique handle shown in the nav bar. Letters and numbers only.</span>
            </label>
            <label>
              Bio
              <textarea
                rows={4}
                maxLength={280}
                value={form.bio || ''}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell readers a little about yourself…"
              />
              <span className="field-hint">{(form.bio || '').length}/280 characters</span>
            </label>

            <div className="field-group banner-upload-section">
              <span className="field-label">Profile banner</span>
              <p className="field-hint">
                Wattpad-style header image on your public profile. Wide images work best (1920×600 recommended) — max 3MB.
              </p>
              <div
                className="banner-upload-preview"
                style={
                  user.bannerUrl
                    ? { backgroundImage: `url(${user.bannerUrl})` }
                    : { background: `linear-gradient(135deg, ${form.avatarColor || user.avatarColor}, #FEC8D8)` }
                }
              />
              <div className="avatar-upload-actions">
                <button
                  type="button"
                  className="btn secondary"
                  disabled={uploadingBanner}
                  onClick={() => bannerInputRef.current?.click()}
                >
                  {uploadingBanner ? 'Uploading…' : user.bannerUrl ? 'Change banner' : 'Upload banner'}
                </button>
                {user.bannerUrl && (
                  <button type="button" className="btn ghost" disabled={uploadingBanner} onClick={removeBanner}>
                    Remove banner
                  </button>
                )}
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={handleBannerUpload}
                />
              </div>
            </div>

            <div className="field-group avatar-upload-section">
              <span className="field-label">Profile photo</span>
              <p className="field-hint">Upload a photo or keep your colored initials. JPG, PNG, WebP, or GIF — max 2MB.</p>
              <div className="avatar-upload-row">
                <Avatar user={displayUser} size="lg" />
                <div className="avatar-upload-actions">
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={uploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {uploadingAvatar ? 'Uploading…' : user.avatarUrl ? 'Change photo' : 'Upload photo'}
                  </button>
                  {user.avatarUrl && (
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={uploadingAvatar}
                      onClick={removeAvatar}
                    >
                      Remove photo
                    </button>
                  )}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    hidden
                    onChange={handleAvatarUpload}
                  />
                </div>
              </div>
            </div>

            <div className="field-group">
              <span className="field-label">Avatar color</span>
              <p className="field-hint">Used when you don&apos;t have a photo, or as a ring behind your image.</p>
              <div className="color-swatches">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch ${form.avatarColor === color ? 'active' : ''}`}
                    style={{ background: color }}
                    aria-label={`Avatar color ${color}`}
                    onClick={() => setForm({ ...form, avatarColor: color })}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="profile-card profile-card-muted">
            <h2>Account</h2>
            <dl className="account-details">
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Sign-in method</dt>
                <dd className="capitalize">{user.provider}</dd>
              </div>
              {MONETIZATION_ENABLED && (
                <div>
                  <dt>Coin balance</dt>
                  <dd>
                    ◎ {user.coins}{' '}
                    <Link to="/wallet" className="text-link">Top up</Link>
                  </dd>
                </div>
              )}
            </dl>
            <p className="field-hint">Email and sign-in are managed by your login provider and cannot be changed here.</p>
          </section>
        </div>
      )}

      {validTab === 'reading' && (
        <div className="profile-panel">
          <section className="profile-card">
            <div className="profile-card-head">
              <h2>Discovery preferences</h2>
              <p className="field-hint">Shape your home feed and hide content you would rather not see.</p>
            </div>

            <div className="field-group">
              <span className="field-label">Favorite genres</span>
              <p className="field-hint">Selected genres boost similar stories on your home page.</p>
              <div className="tag-cloud compact">
                {genres.map((genre) => (
                  <button
                    key={genre.slug}
                    type="button"
                    className={`tag-chip ${form.favoriteGenres?.includes(genre.name) ? 'active' : ''}`}
                    onClick={() => toggleGenre(genre.name)}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <span className="field-label">Blocked tags</span>
              <p className="field-hint">
                AO3-style filtering — stories carrying any of these tags are hidden from browse results.
              </p>
              <div className="blocked-tag-input">
                <input
                  value={blockedInput}
                  onChange={(e) => setBlockedInput(e.target.value)}
                  placeholder="e.g. horror, omegaverse"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBlockedTag())}
                />
                <button type="button" className="btn secondary" onClick={addBlockedTag}>Add tag</button>
              </div>
              {(form.blockedTags || []).length > 0 ? (
                <div className="tag-row">
                  {(form.blockedTags || []).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="tag-chip active removable"
                      onClick={() => removeBlockedTag(tag)}
                      title="Click to remove"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
              ) : (
                <p className="empty-hint">No blocked tags yet.</p>
              )}
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-card-head">
              <h2>Site display</h2>
              <p className="field-hint">Text size, colors, and typeface for the whole library. Changes apply immediately.</p>
            </div>

            <div className="option-group">
              <span className="field-label" id="ui-scale-label">Text size</span>
              <div className="option-row" role="group" aria-labelledby="ui-scale-label">
                {UI_SCALES.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    className={`option-btn ${prefs.uiScale === size.id ? 'active' : ''}`}
                    onClick={() => {
                      setPrefs({ uiScale: size.id as UiScale })
                      setForm({ ...form, uiScale: size.id })
                    }}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="option-group">
              <span className="field-label" id="site-theme-label">Colors</span>
              <div className="option-row" role="group" aria-labelledby="site-theme-label">
                {SITE_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`option-btn ${prefs.siteTheme === theme.id ? 'active' : ''}`}
                    title={theme.hint}
                    onClick={() => {
                      setPrefs({ siteTheme: theme.id as SiteTheme })
                      setForm({ ...form, siteTheme: theme.id })
                    }}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="option-group">
              <span className="field-label" id="ui-font-label">Typeface</span>
              <div className="option-row" role="group" aria-labelledby="ui-font-label">
                {UI_FONTS.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    className={`option-btn ${prefs.uiFont === font.id ? 'active' : ''}`}
                    onClick={() => {
                      setPrefs({ uiFont: font.id as UiFont })
                      setForm({ ...form, uiFont: font.id })
                    }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            </div>
            <ToggleRow
              label="Reduce motion"
              hint="Limit animations and hover movement across the site."
              checked={prefs.reduceMotion}
              onChange={(v) => {
                setPrefs({ reduceMotion: v })
                setForm({ ...form, reduceMotion: v })
              }}
            />
          </section>

          <section className="profile-card">
            <div className="profile-card-head">
              <h2>Reader appearance</h2>
              <p className="field-hint">These settings apply whenever you open a chapter.</p>
            </div>

            <div className="option-group">
              <span className="field-label">Theme</span>
              <div className="option-row">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`option-btn ${form.readerTheme === theme.id ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, readerTheme: theme.id })}
                    title={theme.hint}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="option-group">
              <span className="field-label">Font size</span>
              <div className="option-row">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    className={`option-btn ${form.readerFontSize === size.id ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, readerFontSize: size.id })}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="option-group">
              <span className="field-label">Typeface</span>
              <div className="option-row">
                {FONTS.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    className={`option-btn ${form.readerFont === font.id ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, readerFont: font.id })}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`reader-preview theme-${form.readerTheme} size-${form.readerFontSize} font-${form.readerFont}`}
            >
              <p className="preview-label">Live preview</p>
              <p>The rain against the window sounded like someone trying to get back in.</p>
            </div>
          </section>
        </div>
      )}

      {validTab === 'notifications' && (
        <div className="profile-panel">
          <section className="profile-card">
            <div className="profile-card-head">
              <h2>Notification preferences</h2>
              <p className="field-hint">
                Choose what you want to hear about. Notifications are in-app for now; email delivery is coming soon.
              </p>
            </div>

            <div className="toggle-list">
              <ToggleRow
                label="New chapters"
                hint="When an author you follow or a story in your history publishes a new chapter."
                checked={form.notifyNewChapters ?? true}
                onChange={(v) => setForm({ ...form, notifyNewChapters: v })}
              />
              <ToggleRow
                label="Comment replies"
                hint="When someone replies to your story comments or inline notes."
                checked={form.notifyReplies ?? true}
                onChange={(v) => setForm({ ...form, notifyReplies: v })}
              />
              <ToggleRow
                label="Forum activity"
                hint="Replies to threads you started or participated in."
                checked={form.notifyForum ?? true}
                onChange={(v) => setForm({ ...form, notifyForum: v })}
              />
              {MONETIZATION_ENABLED && (
                <ToggleRow
                  label="Tips received"
                  hint="When a reader sends you coins on one of your stories."
                  checked={form.notifyTips ?? true}
                  onChange={(v) => setForm({ ...form, notifyTips: v })}
                />
              )}
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-card-head">
              <h2>Email digest</h2>
              <p className="field-hint">Optional weekly summary sent to {user.email}.</p>
            </div>
            <ToggleRow
              label="Weekly reading digest"
              hint="A Sunday email with new chapters, forum highlights, and your reading stats."
              checked={form.emailDigest ?? false}
              onChange={(v) => setForm({ ...form, emailDigest: v })}
            />
          </section>
        </div>
      )}

      {validTab === 'history' && (
        <div className="profile-panel">
          <section className="profile-card history-card">
            <div className="profile-card-head">
              <h2>Your activity</h2>
              <p className="field-hint">
                {MONETIZATION_ENABLED
                  ? 'Pick up where you left off, review unlocks, and see tips you have sent.'
                  : 'Pick up where you left off in stories you have started.'}
              </p>
            </div>

            {MONETIZATION_ENABLED && (
            <div className="history-subnav">
              {([
                ['reading', 'Continue reading'],
                ['unlocks', 'Unlocks'],
                ['tips', 'Tips sent'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`history-subtab ${historySection === id ? 'active' : ''}`}
                  onClick={() => setHistorySection(id)}
                >
                  {label}
                  {history && (
                    <span className="tab-count">
                      {id === 'reading' ? history.reading.length : id === 'unlocks' ? history.unlocks.length : history.tips.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            )}

            {historyLoading && <p className="empty-hint">Loading your history…</p>}

            {!historyLoading && (MONETIZATION_ENABLED ? historySection === 'reading' : true) && (
              history?.reading.length ? (
                <ul className="history-list">
                  {history.reading.map((entry) => (
                    <li key={`${entry.storyId}-${entry.chapterNum}`} className="history-item">
                      <Link
                        to={`/story/${entry.storyId}/read/${entry.chapterNum}`}
                        className="history-cover"
                        style={{ background: entry.coverColor }}
                        aria-hidden
                      />
                      <div className="history-body">
                        <Link to={`/story/${entry.storyId}/read/${entry.chapterNum}`} className="history-title">
                          {entry.storyTitle}
                        </Link>
                        <p className="history-meta">
                          Ch. {entry.chapterNum}
                          {entry.chapterTitle ? `: ${entry.chapterTitle}` : ''} · by {entry.authorName}
                        </p>
                        <p className="history-when">Last read {formatWhen(entry.updatedAt)}</p>
                      </div>
                      <Link
                        to={`/story/${entry.storyId}/read/${entry.chapterNum}`}
                        className="btn secondary small-btn"
                      >
                        Continue
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="history-empty">
                  <p>No reading history yet.</p>
                  <p className="field-hint">Open any chapter while signed in and we will track your place automatically.</p>
                  <Link to="/browse" className="btn primary">Browse stories</Link>
                </div>
              )
            )}

            {MONETIZATION_ENABLED && !historyLoading && historySection === 'unlocks' && (
              history?.unlocks.length ? (
                <ul className="history-list">
                  {history.unlocks.map((entry, i) => (
                    <li key={`${entry.storyId}-${entry.chapterNum}-${i}`} className="history-item">
                      <Link
                        to={`/story/${entry.storyId}/read/${entry.chapterNum}`}
                        className="history-cover"
                        style={{ background: entry.coverColor }}
                        aria-hidden
                      />
                      <div className="history-body">
                        <Link to={`/story/${entry.storyId}`} className="history-title">
                          {entry.storyTitle}
                        </Link>
                        <p className="history-meta">
                          Unlocked Ch. {entry.chapterNum}: {entry.chapterTitle}
                        </p>
                        <p className="history-when">
                          ◎ {entry.coinCost} · {formatWhen(entry.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="history-empty">
                  <p>No VIP chapters unlocked yet.</p>
                  <p className="field-hint">Paid chapters you unlock with coins will show up here.</p>
                  <Link to="/vip" className="btn secondary">Browse VIP stories</Link>
                </div>
              )
            )}

            {MONETIZATION_ENABLED && !historyLoading && historySection === 'tips' && (
              history?.tips.length ? (
                <ul className="history-list">
                  {history.tips.map((entry, i) => (
                    <li key={`${entry.storyId}-${i}`} className="history-item">
                      <div className="history-body">
                        <Link to={`/story/${entry.storyId}`} className="history-title">
                          {entry.storyTitle}
                        </Link>
                        <p className="history-meta">
                          ◎ {entry.amount} to {entry.authorName}
                          {entry.message ? ` — "${entry.message}"` : ''}
                        </p>
                        <p className="history-when">{formatWhen(entry.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="history-empty">
                  <p>No tips sent yet.</p>
                  <p className="field-hint">Support authors directly from any story page.</p>
                  <Link to="/browse" className="btn secondary">Find a story to support</Link>
                </div>
              )
            )}
          </section>
        </div>
      )}

      {showSaveBar && (
        <div className="profile-save-bar">
          <p>You have unsaved changes</p>
          <div className="profile-save-actions">
            <button type="button" className="btn ghost" onClick={discard} disabled={saving}>
              Discard
            </button>
            <button type="button" className="btn primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
