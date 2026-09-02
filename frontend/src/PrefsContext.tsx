import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'

export type UiScale = 'sm' | 'md' | 'lg' | 'xl'
export type SiteTheme = 'default' | 'contrast' | 'dusk' | 'cream'
export type UiFont = 'sans' | 'serif' | 'dyslexic'

export type DisplayPrefs = {
  uiScale: UiScale
  siteTheme: SiteTheme
  uiFont: UiFont
  reduceMotion: boolean
}

const STORAGE_KEY = 'wiml-prefs'

const DEFAULTS: DisplayPrefs = {
  uiScale: 'md',
  siteTheme: 'default',
  uiFont: 'sans',
  reduceMotion: false,
}

function readStored(): DisplayPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<DisplayPrefs>
    return {
      uiScale: parsed.uiScale || DEFAULTS.uiScale,
      siteTheme: parsed.siteTheme || DEFAULTS.siteTheme,
      uiFont: parsed.uiFont || DEFAULTS.uiFont,
      reduceMotion: Boolean(parsed.reduceMotion),
    }
  } catch {
    return DEFAULTS
  }
}

function applyPrefs(prefs: DisplayPrefs) {
  const root = document.documentElement
  root.dataset.uiScale = prefs.uiScale
  root.dataset.siteTheme = prefs.siteTheme
  root.dataset.uiFont = prefs.uiFont
  root.dataset.reduceMotion = prefs.reduceMotion ? 'true' : 'false'
}

type PrefsContextValue = {
  prefs: DisplayPrefs
  setPrefs: (next: Partial<DisplayPrefs>) => void
}

const PrefsContext = createContext<PrefsContextValue | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [prefs, setPrefsState] = useState<DisplayPrefs>(() => {
    const stored = readStored()
    applyPrefs(stored)
    return stored
  })

  useEffect(() => {
    if (!user) return
    const fromUser: DisplayPrefs = {
      uiScale: user.uiScale || prefs.uiScale,
      siteTheme: user.siteTheme || prefs.siteTheme,
      uiFont: user.uiFont || prefs.uiFont,
      reduceMotion: user.reduceMotion ?? prefs.reduceMotion,
    }
    setPrefsState(fromUser)
    applyPrefs(fromUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fromUser))
    // Only hydrate from the account once per login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const setPrefs = (next: Partial<DisplayPrefs>) => {
    setPrefsState((current) => {
      const merged = { ...current, ...next }
      applyPrefs(merged)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      return merged
    })
  }

  const value = useMemo(() => ({ prefs, setPrefs }), [prefs])

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider')
  return ctx
}
