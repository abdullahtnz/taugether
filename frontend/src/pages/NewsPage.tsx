import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { newsApi, tagApi, apiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Post, Tag } from '../types'
import PostCard from '../components/post/PostCard'
import PostForm from '../components/post/PostForm'
import Pagination from '../components/ui/Pagination'
import { PageLoader } from '../components/ui/Spinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import Button from '../components/ui/Button'

const LIMIT = 10

export default function NewsPage() {
  const { user } = useAuth()
  const [tags, setTags] = useState<Tag[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    tagApi.list().then(setTags).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    newsApi
      .list(offset, LIMIT)
      .then((data) => {
        if (!cancelled) {
          setPosts(data)
          setError('')
        }
      })
      .catch((e) => !cancelled && setError(apiError(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [offset])

  const isAdmin = user?.is_admin

  return (
    <>
      <Helmet>
        <title>University news — taugether</title>
        <meta
          name="description"
          content="Official announcements and news from Türkiye-Azerbaijan University, posted by the taugether administration."
        />
      </Helmet>

      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">University news</h1>
            <p className="text-sm text-gray-500">Official announcements from the administration</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : '+ New news'}</Button>
          )}
        </div>

        {showForm && isAdmin && (
          <div className="mb-6">
            <PostForm
              tags={tags}
              isNews
              onCreated={() => {
                setShowForm(false)
                setOffset(0)
                newsApi.list(0, LIMIT).then(setPosts).catch(() => {})
              }}
            />
          </div>
        )}

        <ErrorMessage message={error} />

        {loading ? (
          <PageLoader />
        ) : posts.length === 0 ? (
          <div className="rounded-xl bg-white py-16 text-center text-gray-400">
            No news yet.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={() => {
                  newsApi.list(offset, LIMIT).then(setPosts).catch(() => {})
                }}
              />
            ))}
            <Pagination
              offset={offset}
              limit={LIMIT}
              hasMore={posts.length === LIMIT}
              onPrev={() => setOffset((o) => Math.max(0, o - LIMIT))}
              onNext={() => setOffset((o) => o + LIMIT)}
            />
          </div>
        )}
      </div>
    </>
  )
}
