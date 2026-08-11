import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { postApi, apiError } from '../api/client'
import type { Post } from '../types'
import PostCard from '../components/post/PostCard'
import Pagination from '../components/ui/Pagination'
import { PageLoader } from '../components/ui/Spinner'
import ErrorMessage from '../components/ui/ErrorMessage'

const LIMIT = 10

export default function BookmarkedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    postApi
      .bookmarks(offset, LIMIT)
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

  return (
    <>
      <Helmet>
        <title>Saved posts — taugether</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Saved posts</h1>
        <ErrorMessage message={error} />
        {loading ? (
          <PageLoader />
        ) : posts.length === 0 ? (
          <div className="rounded-xl bg-white py-16 text-center text-gray-400">
            You have no saved posts yet.
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onUpdate={() => {
                    postApi.bookmarks(offset, LIMIT).then(setPosts).catch(() => {})
                  }}
                />
              ))}
            </div>
            <Pagination
              offset={offset}
              limit={LIMIT}
              hasMore={posts.length === LIMIT}
              onPrev={() => setOffset((o) => Math.max(0, o - LIMIT))}
              onNext={() => setOffset((o) => o + LIMIT)}
            />
          </>
        )}
      </div>
    </>
  )
}
