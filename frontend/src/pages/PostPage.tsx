import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { postApi, tagApi, apiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Post, Comment, Tag } from '../types'
import Avatar from '../components/ui/Avatar'
import TagBadge from '../components/ui/TagBadge'
import Button from '../components/ui/Button'
import { PageLoader } from '../components/ui/Spinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import CommentSection from '../components/post/CommentSection'
import ReportModal from '../components/post/ReportModal'
import { timeAgo, formatCount, pluralize, formatBytes } from '../utils/format'

export default function PostPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTag, setEditTag] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([postApi.get(id), postApi.comments(id)])
      .then(([p, c]) => {
        if (cancelled) return
        setPost(p)
        setComments(c)
        setEditTitle(p.title)
        setEditContent(p.content)
        setEditTag(p.tag_id)
        setError('')
      })
      .catch((e) => !cancelled && setError(apiError(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    tagApi.list().then(setTags).catch(() => {})
  }, [])

  async function toggleLike() {
    if (!post) return
    const res = await postApi.toggleLike(post.id).catch(() => null)
    if (res) {
      setPost((p) =>
        p
          ? {
              ...p,
              is_liked: res!.liked,
              like_count: p.like_count + (res!.liked ? 1 : -1),
            }
          : p
      )
    }
  }

  async function toggleBookmark() {
    if (!post) return
    const res = await postApi.toggleBookmark(post.id).catch(() => null)
    if (res) setPost((p) => (p ? { ...p, is_bookmarked: res!.bookmarked } : p))
  }

  async function removePost() {
    if (!post || !window.confirm('Delete this post?')) return
    try {
      await postApi.remove(post.id)
      navigate('/feed')
    } catch (e) {
      setError(apiError(e))
    }
  }

  async function saveEdit() {
    if (!post || !editTitle.trim() || !editTag) return
    try {
      const updated = await postApi.update(post.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        tag_id: editTag,
      })
      setPost(updated)
      setEditing(false)
    } catch (e) {
      setError(apiError(e))
    }
  }

  const canEdit = post && user && (post.author.id === user.id || user.is_admin)
  const isAdmin = user?.is_admin

  if (loading) return <PageLoader />
  if (error || !post) {
    return (
      <div className="py-16 text-center">
        <ErrorMessage message={error || 'Post not found'} />
        <Link to="/feed" className="mt-4 inline-block text-primary-600 hover:underline">
          Back to feed
        </Link>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>{post.title} — taugether</title>
        <meta name="description" content={`${post.content?.slice(0, 155) || 'Discussion on taugether'} — posted by ${post.author.username}`} />
        <link rel="canonical" href={`https://taugether.org/post/${post.id}`} />
      </Helmet>

      <article className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar username={post.author.username} profilePicture={post.author.profile_picture} size="md" />
            <div className="min-w-0 flex-1">
              <Link
                to={`/profile/${post.author.username}`}
                className="text-sm font-semibold text-gray-900 hover:text-primary-600"
              >
                {post.author.username}
                {post.author.is_admin && (
                  <span className="ml-1 rounded bg-primary-100 px-1 text-[10px] font-bold text-primary-700">
                    ADMIN
                  </span>
                )}
              </Link>
              <p className="text-xs text-gray-400">
                {timeAgo(post.created_at)}
                {post.is_edited && <span className="ml-1">• edited</span>}
                {isAdmin && (
                  <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                    ID: {post.id}
                  </span>
                )}
              </p>
            </div>
            <TagBadge tag={post.tag} />
          </div>

          <h1 className="mt-4 text-2xl font-bold leading-tight text-gray-900">{post.title}</h1>
          {post.content && (
            <p className="mt-3 whitespace-pre-line text-gray-700">{post.content}</p>
          )}

          {post.images.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {post.images.map((img) => (
                <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={img.url}
                    alt={post.title}
                    loading="lazy"
                    className="w-full rounded-lg object-cover transition hover:opacity-90"
                  />
                </a>
              ))}
            </div>
          )}

          {post.files.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Attachments</h3>
              {post.files.map((f) => (
                <a
                  key={f.id}
                  href={f.url}
                  download={f.original_name}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-primary-300 hover:bg-primary-50"
                >
                  <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{f.original_name}</p>
                    <p className="text-xs text-gray-400">{formatBytes(f.size)}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary-600">Download</span>
                </a>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center gap-1 border-t border-gray-100 pt-3">
            {user && !post.is_news && (
              <>
                <Button variant="ghost" size="sm" onClick={toggleLike} className={post.is_liked ? 'text-primary-600' : ''}>
                  <svg className="h-4 w-4" fill={post.is_liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  {formatCount(post.like_count)} {pluralize(post.like_count, 'like')}
                </Button>
                <Button variant="ghost" size="sm" onClick={toggleBookmark} className={post.is_bookmarked ? 'text-amber-500' : ''}>
                  <svg className="h-4 w-4" fill={post.is_bookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {post.is_bookmarked ? 'Saved' : 'Save'}
                </Button>
              </>
            )}
            {!post.is_news && (
              <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)} className="text-gray-400 hover:text-red-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Report
              </Button>
            )}
            <div className="ml-auto flex gap-1">
              {canEdit && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
                    {editing ? 'Cancel' : 'Edit'}
                  </Button>
                  <Button variant="danger" size="sm" onClick={removePost}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {editing && (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-3 font-bold text-gray-900">Edit post</h2>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setEditTag(tag.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    editTag === tag.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={!editTitle.trim() || !editTag}>
                Save changes
              </Button>
            </div>
          </div>
        )}

        <CommentSection postId={post.id} comments={comments} />
      </article>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} postId={post.id} onReported={() => setReportOpen(false)} />
    </>
  )
}
