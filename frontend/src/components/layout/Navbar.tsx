import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { notificationApi } from '../../api/client'
import type { Notification } from '../../types'
import { timeAgo } from '../../utils/format'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    isActive ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
  }`

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    notificationApi
      .list(0, 15)
      .then((d) => {
        setNotifs(d.notifications)
        setUnread(d.unread)
      })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
    setQuery('')
  }

  async function openNotifications() {
    setNotifOpen((v) => !v)
    if (!notifOpen) {
      const d = await notificationApi.list(0, 15).catch(() => null)
      if (d) {
        setNotifs(d.notifications)
        setUnread(d.unread)
      }
    }
    if (notifOpen) {
      await notificationApi.markRead().catch(() => {})
      setUnread(0)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 font-extrabold text-white">
            t
          </div>
          <span className="text-xl font-extrabold tracking-tight text-gray-900">
            tau<span className="text-primary-600">gether</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/feed" className={navLinkClass}>
            Feed
          </NavLink>
          <NavLink to="/news" className={navLinkClass}>
            News
          </NavLink>
          <NavLink to="/clubs" className={navLinkClass}>
            Clubs
          </NavLink>
        </nav>

        <form onSubmit={handleSearch} className="ml-auto hidden max-w-xs flex-1 sm:block">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts..."
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
        </form>

        {user ? (
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={openNotifications}
                className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Notifications"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  <div className="border-b border-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                    Notifications
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">
                        No notifications yet
                      </div>
                    )}
                    {notifs.map((n) => (
                      <Link
                        key={n.id}
                        to={n.post_id ? `/post/${n.post_id}` : '#'}
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50"
                      >
                        <Avatar username={n.actor.username} profilePicture={n.actor.profile_picture} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold">{n.actor.username}</span>{' '}
                            {n.type === 'comment' && 'commented on your post'}
                            {n.type === 'reply' && 'replied to your comment'}
                            {n.type === 'like' && 'liked your post'}
                          </p>
                          {n.post_title && (
                            <p className="truncate text-xs text-gray-400">{n.post_title}</p>
                          )}
                          <p className="mt-0.5 text-xs text-gray-400">{timeAgo(n.created_at)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen((v) => !v)} className="rounded-full hover:ring-2 hover:ring-primary-400">
                <Avatar username={user.username} profilePicture={user.profile_picture} size="md" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-gray-100 px-4 py-2">
                    <p className="truncate text-sm font-semibold text-gray-900">{user.username}</p>
                    <p className="truncate text-xs text-gray-500">{user.email}</p>
                  </div>
                  <Link
                    to={`/profile/${user.username}`}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    My profile
                  </Link>
                  <Link
                    to="/bookmarks"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Saved posts
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Settings
                  </Link>
                  {user.is_admin && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50"
                    >
                      Admin panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      logout()
                      navigate('/')
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Log in
            </Button>
            <Button onClick={() => navigate('/signup')}>Sign up</Button>
          </div>
        )}
      </div>

      {/* Mobile nav */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2 md:hidden">
        <NavLink to="/feed" className={navLinkClass}>
          Feed
        </NavLink>
        <NavLink to="/news" className={navLinkClass}>
          News
        </NavLink>
        <NavLink to="/clubs" className={navLinkClass}>
          Clubs
        </NavLink>
      </div>
    </header>
  )
}
