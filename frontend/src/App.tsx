import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import { PrefsProvider } from './PrefsContext'
import { MONETIZATION_ENABLED } from './features'
import { userProfilePath } from './components/Avatar'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import StoryPage from './pages/StoryPage'
import ReaderPage from './pages/ReaderPage'
import WalletPage from './pages/WalletPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import BrowsePage from './pages/BrowsePage'
import ProfilePage from './pages/ProfilePage'
import PublicProfilePage from './pages/PublicProfilePage'
import ForumPage from './pages/ForumPage'
import ForumThreadPage from './pages/ForumThreadPage'
import LoginPage from './pages/LoginPage'
import MyWorksPage from './pages/MyWorksPage'
import StoryEditPage from './pages/StoryEditPage'
import ChapterEditPage from './pages/ChapterEditPage'
import './App.css'

function MeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-state">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={userProfilePath(user) || '/profile'} replace />
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-state">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <PrefsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/story/:id" element={<StoryPage />} />
            <Route path="/story/:id/read/:num" element={<ReaderPage />} />
            <Route path="/wallet" element={MONETIZATION_ENABLED ? <WalletPage /> : <Navigate to="/browse" replace />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/originals" element={<BrowsePage variant="originals" />} />
            <Route path="/fanfics" element={<BrowsePage variant="fanfics" />} />
            <Route path="/vip" element={MONETIZATION_ENABLED ? <BrowsePage variant="vip" /> : <Navigate to="/browse" replace />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/me" element={<MeRedirect />} />
            <Route path="/user/:username" element={<PublicProfilePage />} />
            <Route
              path="/write"
              element={
                <RequireAuth>
                  <MyWorksPage />
                </RequireAuth>
              }
            />
            <Route
              path="/write/:storyId"
              element={
                <RequireAuth>
                  <StoryEditPage />
                </RequireAuth>
              }
            />
            <Route
              path="/write/:storyId/chapters/:chapterId"
              element={
                <RequireAuth>
                  <ChapterEditPage />
                </RequireAuth>
              }
            />
            <Route path="/forum" element={<ForumPage />} />
            <Route path="/forum/thread/:id" element={<ForumThreadPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </PrefsProvider>
    </AuthProvider>
  )
}

export default App
