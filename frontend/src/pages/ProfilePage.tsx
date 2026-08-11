import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { userApi, apiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Post, User } from '../types'
import Avatar from '../components/ui/Avatar'
import RoleBadge from '../components/ui/RoleBadge'
import PostCard from '../components/post/PostCard'
import Button from '../components/ui/Button'
import { PageLoader } from '../components/ui/Spinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { timeAgo } from '../utils/format'

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user: me } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!username) return
    let cancelled = false
    setLoading(true)
    userApi
      .getByUsername(username)
      .then((u) => {
        if (cancelled) return
        setProfile(u)
        setError('')
        return userApi.userPosts(username, 0, 5)
      })
      .then((p) => !cancelled && setPosts(p || []))
      .catch((e) => !cancelled && setError(apiError(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [username])

  if (loading) return <PageLoader />
  if (error || !profile) {
    return (
      <div className="py-16 text-center">
        <ErrorMessage message={error || 'User not found'} />
      </div>
    )
  }

  const isOwnProfile = me?.username === profile.username

  return (
    <>
      <Helmet>
        <title>{profile.username} — taugether</title>
        <meta name="description" content={`${profile.username}'s profile on taugether — year role, clubs and posts.`} />
        <link rel="canonical" href={`https://taugether.org/profile/${profile.username}`} />
      </Helmet>

      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar username={profile.username} profilePicture={profile.profile_picture} size="xl" />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-900 sm:justify-start">
                {profile.username}
                {profile.is_admin && (
                  <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold text-primary-700">
                    ADMIN
                  </span>
                )}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Joined {timeAgo(profile.created_at)} · {profile.post_count ?? 0} posts
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                {profile.year_role && <RoleBadge role={profile.year_role} />}
                {profile.roles?.map((role) => <RoleBadge key={role.id} role={role} />)}
                {!profile.year_role && (profile.roles?.length ?? 0) === 0 && (
                  <span className="text-xs text-gray-400">No roles yet</span>
                )}
              </div>
              {isOwnProfile && (
                <div className="mt-4 text-center sm:text-left">
                  <Link to="/settings">
                    <Button variant="outline" size="sm">
                      Edit profile
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="mb-3 font-bold text-gray-900">Recent posts</h2>
          {posts.length === 0 ? (
            <div className="rounded-xl bg-white py-10 text-center text-gray-400">
              No posts yet.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
