import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { postApi, tagApi, apiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Post, Tag } from '../types'
import PostCard from '../components/post/PostCard'
import PostForm from '../components/post/PostForm'
import Pagination from '../components/ui/Pagination'
import { PageLoader } from '../components/ui/Spinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import Button from '../components/ui/Button'

const LIMIT = 10

export default function Feed() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTag = searchParams.get('tag') || ''
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
    setOffset(0)
  }, [activeTag])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    postApi
      .list({ tag: activeTag || undefined, offset, limit: LIMIT })
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
  }, [activeTag, offset])

  function selectTag(tag: string) {
    if (tag === activeTag) {
      setSearchParams({})
    } else {
      setSearchParams({ tag })
    }
  }

  return (
    <>
      <Helmet>
        <title>{activeTag ? `${activeTag} posts — taugether` : 'Feed — taugether'}</title>
        <meta name="robots" content="index,follow" />
      </Helmet>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => selectTag('')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                !activeTag ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 shadow-sm hover:bg-gray-100'
              }`}
            >
              All
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => selectTag(tag.name)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  activeTag === tag.name
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 shadow-sm hover:bg-gray-100'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>

          {user && (
            <div className="mb-4">
              <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm((v) => !v)}>
                {showForm ? 'Close' : '+ New post'}
              </Button>
            </div>
          )}

          {showForm && user && (
            <div className="mb-6">
              <PostForm
                tags={tags}
                onCreated={() => {
                  setShowForm(false)
                  setOffset(0)
                  postApi.list({ tag: activeTag || undefined, offset: 0, limit: LIMIT }).then(setPosts).catch(() => {})
                }}
              />
            </div>
          )}

          <ErrorMessage message={error} />

          {loading ? (
            <PageLoader />
          ) : posts.length === 0 ? (
            <div className="rounded-xl bg-white py-16 text-center text-gray-400">
              No posts yet.
              {user && ' Be the first to share something!'}
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onUpdate={() => {
                    postApi.list({ tag: activeTag || undefined, offset, limit: LIMIT }).then(setPosts).catch(() => {})
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

        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-gray-900">How taugether works</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>• Pick a tag for your post: Exam, Study, University or Question.</li>
              <li>• Attach images (max 2MB each) or files with no limit.</li>
              <li>• Like, comment and save posts you find useful.</li>
              <li>• Join clubs to show what you are into.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  )
}
