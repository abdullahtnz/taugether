import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Post } from '../../types'
import { timeAgo, formatCount, pluralize } from '../../utils/format'
import { postApi } from '../../api/client'
import Avatar from '../ui/Avatar'
import TagBadge from '../ui/TagBadge'
import Button from '../ui/Button'
import ReportModal from './ReportModal'

export default function PostCard({ post, onUpdate }: { post: Post; onUpdate?: () => void }) {
  const navigate = useNavigate()
  const [reportOpen, setReportOpen] = useState(false)
  const [liked, setLiked] = useState(post.is_liked)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [bookmarked, setBookmarked] = useState(post.is_bookmarked)

  async function toggleLike(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const res = await postApi.toggleLike(post.id).catch(() => null)
    if (res) {
      setLiked(res.liked)
      setLikeCount((c) => c + (res.liked ? 1 : -1))
    }
  }

  async function toggleBookmark(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const res = await postApi.toggleBookmark(post.id).catch(() => null)
    if (res) setBookmarked(res.bookmarked)
  }

  return (
    <article className="rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <Link to={`/post/${post.id}`} className="block p-5">
        <div className="flex items-center gap-3">
          <Avatar username={post.author.username} profilePicture={post.author.profile_picture} size="sm" />
          <div className="min-w-0 flex-1">
            <Link
              to={`/profile/${post.author.username}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-semibold text-gray-900 hover:text-primary-600"
            >
              {post.author.username}
              {post.author.is_admin && (
                <span className="ml-1 rounded bg-primary-100 px-1 text-[10px] font-bold text-primary-700">
                  ADMIN
                </span>
              )}
            </Link>
            <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
          </div>
          <TagBadge tag={post.tag} />
        </div>

        <h2 className="mt-3 text-lg font-bold leading-snug text-gray-900">{post.title}</h2>
        {post.content && (
          <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm text-gray-600">{post.content}</p>
        )}

        {post.images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {post.images.slice(0, 4).map((img) => (
              <img
                key={img.id}
                src={img.url}
                alt={post.title}
                loading="lazy"
                className="h-40 w-full rounded-lg object-cover"
              />
            ))}
          </div>
        )}

        {post.files.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {post.files.slice(0, 3).map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                {f.original_name}
              </span>
            ))}
            {post.files.length > 3 && (
              <span className="text-xs text-gray-400">+{post.files.length - 3} more</span>
            )}
          </div>
        )}
      </Link>

      <div className="flex items-center gap-1 border-t border-gray-100 px-3 py-2">
        <Button variant="ghost" size="sm" onClick={toggleLike} className={liked ? 'text-primary-600' : ''}>
          <svg className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          {formatCount(likeCount)} {pluralize(likeCount, 'like')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/post/${post.id}`)}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {formatCount(post.comment_count)}
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={toggleBookmark} className={bookmarked ? 'text-amber-500' : ''}>
            <svg className="h-4 w-4" fill={bookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {bookmarked ? 'Saved' : 'Save'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)} className="text-gray-400 hover:text-red-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </Button>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        postId={post.id}
        onReported={() => setReportOpen(false)}
        onUpdate={onUpdate}
      />
    </article>
  )
}
