import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { searchApi, apiError } from '../api/client'
import type { Post } from '../types'
import PostCard from '../components/post/PostCard'
import Pagination from '../components/ui/Pagination'
import { PageLoader } from '../components/ui/Spinner'
import ErrorMessage from '../components/ui/ErrorMessage'

const LIMIT = 10

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [posts, setPosts] = useState<Post[]>([])
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setOffset(0)
  }, [q])

  useEffect(() => {
    if (!q) {
      setPosts([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    searchApi
      .posts(q, offset, LIMIT)
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
  }, [q, offset])

  return (
    <>
      <Helmet>
        <title>{q ? `Search: ${q} — taugether` : 'Search — taugether'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">
          {q ? `Results for "${q}"` : 'Search'}
        </h1>
        <p className="mb-4 text-sm text-gray-500">Search across all community posts</p>

        {!q ? (
          <div className="rounded-xl bg-white py-16 text-center text-gray-400">
            Use the search bar above to find posts.
          </div>
        ) : (
          <>
            <ErrorMessage message={error} />
            {loading ? (
              <PageLoader />
            ) : posts.length === 0 ? (
              <div className="rounded-xl bg-white py-16 text-center text-gray-400">
                No results found for "{q}".
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
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
          </>
        )}
      </div>
    </>
  )
}
