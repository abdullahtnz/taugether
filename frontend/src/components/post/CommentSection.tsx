import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Comment } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { postApi, apiError } from '../../api/client'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import ErrorMessage from '../ui/ErrorMessage'
import { timeAgo } from '../../utils/format'

interface CommentItemProps {
  comment: Comment
  postId: string
  onDeleted: (id: string) => void
}

function CommentNode({ comment, postId, onDeleted, isReply }: CommentItemProps & { isReply?: boolean }) {
  const { user } = useAuth()
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canDelete = user && (user.id === comment.author.id || user.is_admin)

  async function submitReply() {
    if (!replyText.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await postApi.addComment(postId, replyText.trim(), comment.id)
      setReplyText('')
      setReplying(false)
      window.location.reload()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function remove() {
    if (!window.confirm('Delete this comment?')) return
    try {
      await postApi.deleteComment(comment.id)
      onDeleted(comment.id)
    } catch (e) {
      setError(apiError(e))
    }
  }

  return (
    <div className={`mt-3 ${isReply ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div className="flex gap-3">
        <Avatar username={comment.author.username} profilePicture={comment.author.profile_picture} size="sm" />
        <div className="min-w-0 flex-1 rounded-xl bg-white p-3">
          <div className="flex items-center gap-2">
            <Link
              to={`/profile/${comment.author.username}`}
              className="text-sm font-semibold text-gray-900 hover:text-primary-600"
            >
              {comment.author.username}
            </Link>
            <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
            {canDelete && (
              <button onClick={remove} className="ml-auto text-xs text-gray-400 hover:text-red-500">
                Delete
              </button>
            )}
          </div>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{comment.content}</p>
          {user && comment.depth < 3 && (
            <button
              onClick={() => setReplying((v) => !v)}
              className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              Reply
            </button>
          )}
          {error && <ErrorMessage message={error} />}
          {replying && (
            <div className="mt-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                placeholder="Write a reply..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={submitReply} disabled={submitting || !replyText.trim()}>
                  Reply
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {comment.replies?.map((r) => (
        <CommentNode key={r.id} comment={r} postId={postId} onDeleted={onDeleted} isReply />
      ))}
    </div>
  )
}

export default function CommentSection({ postId, comments }: { postId: string; comments: Comment[] }) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localComments, setLocalComments] = useState<Comment[]>(comments)

  async function submit() {
    if (!content.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const comment = await postApi.addComment(postId, content.trim(), null)
      setLocalComments((prev) => [...prev, comment])
      setContent('')
    } catch (e) {
      setError(apiError(e))
    } finally {
      setSubmitting(false)
    }
  }

  function handleDeleted(id: string) {
    setLocalComments((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold text-gray-900">
        Comments {localComments.length > 0 && `(${localComments.length})`}
      </h2>

      {user ? (
        <div className="mt-4 rounded-xl bg-white p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="Share your thoughts..."
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
          <ErrorMessage message={error} />
          <div className="mt-2 flex justify-end">
            <Button onClick={submit} disabled={submitting || !content.trim()}>
              Comment
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-white p-4 text-sm text-gray-500">
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
            Log in
          </Link>{' '}
          to join the discussion.
        </div>
      )}

      <div className="mt-4">
        {localComments.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No comments yet. Be the first!</p>
        ) : (
          localComments.map((c) => (
            <CommentNode key={c.id} comment={c} postId={postId} onDeleted={handleDeleted} />
          ))
        )}
      </div>
    </section>
  )
}
