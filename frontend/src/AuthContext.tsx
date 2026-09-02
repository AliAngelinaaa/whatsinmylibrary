import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type User } from './api'

interface AuthContextValue {
  user: User | null
  loading: boolean
  loginDev: (email: string, name?: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  setToken: (token: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setUser(null)
      return
    }
    try {
      const me = await api.me()
      setUser(me)
    } catch {
      localStorage.removeItem('token')
      setUser(null)
    }
  }

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [])

  const loginDev = async (email: string, name?: string) => {
    const { token, user: loggedIn } = await api.devLogin(email, name)
    localStorage.setItem('token', token)
    setUser({
      ...loggedIn,
      favoriteGenres: loggedIn.favoriteGenres || [],
      blockedTags: loggedIn.blockedTags || [],
    })
  }

  const setToken = async (token: string) => {
    localStorage.setItem('token', token)
    await refreshUser()
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginDev, logout, refreshUser, setToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
