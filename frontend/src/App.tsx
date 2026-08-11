import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import Feed from './pages/Feed'
import PostPage from './pages/PostPage'
import NewsPage from './pages/NewsPage'
import ClubsPage from './pages/ClubsPage'
import ClubPage from './pages/ClubPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import BookmarkedPage from './pages/BookmarkedPage'
import SearchPage from './pages/SearchPage'
import AdminPage from './pages/AdminPage'
import { useAuth } from './context/AuthContext'
import { PageLoader } from './components/ui/Spinner'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin) return <Navigate to="/feed" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="feed" element={<Feed />} />
        <Route path="post/:id" element={<PostPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="clubs" element={<ClubsPage />} />
        <Route path="clubs/:id" element={<ClubPage />} />
        <Route path="profile/:username" element={<ProfilePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route
          path="bookmarks"
          element={
            <Protected>
              <BookmarkedPage />
            </Protected>
          }
        />
        <Route
          path="settings"
          element={
            <Protected>
              <SettingsPage />
            </Protected>
          }
        />
        <Route
          path="admin"
          element={
            <AdminOnly>
              <AdminPage />
            </AdminOnly>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
