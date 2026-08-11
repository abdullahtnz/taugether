import { useRef, useState } from 'react'
import type { Tag } from '../../types'
import { postApi, newsApi, apiError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { formatBytes } from '../../utils/format'
import Button from '../ui/Button'
import ErrorMessage from '../ui/ErrorMessage'

interface PostFormProps {
  tags: Tag[]
  isNews?: boolean
  onCreated: () => void
}

const MAX_IMAGE_SIZE = 2 * 1024 * 1024

export default function PostForm({ tags, isNews = false, onCreated }: PostFormProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagId, setTagId] = useState<number | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!isNews && !tagId) {
      setError('Please choose a tag')
      return
    }
    if (images.some((img) => img.size > MAX_IMAGE_SIZE)) {
      setError('Each image must be smaller than 2MB')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const form = new FormData()
      form.append('title', title.trim())
      form.append('content', content.trim())
      if (!isNews && tagId) form.append('tag_id', String(tagId))
      images.forEach((img) => form.append('images', img))
      files.forEach((f) => form.append('files', f))

      if (isNews) {
        await newsApi.create(form)
      } else {
        await postApi.create(form)
      }
      setTitle('')
      setContent('')
      setTagId(null)
      setImages([])
      setFiles([])
      onCreated()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setSubmitting(false)
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    const tooLarge = selected.filter((f) => f.size > MAX_IMAGE_SIZE)
    if (tooLarge.length > 0) {
      setError('Each image must be smaller than 2MB')
      return
    }
    setImages((prev) => [...prev, ...selected].slice(0, 5))
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...selected].slice(0, 5))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-gray-900">
        {isNews ? 'Publish news' : 'Create a post'}
      </h2>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        maxLength={255}
        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm font-medium focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder={
          isNews
            ? 'Write the news content...'
            : 'Share your question, study notes, or thoughts...'
        }
        className="mt-3 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      />

      {!isNews && (
        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Tag</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setTagId(tag.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  tagId === tag.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => imageInputRef.current?.click()}
        >
          Add images (max 2MB)
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          Add files
        </Button>
      </div>

      {(images.length > 0 || files.length > 0) && (
        <div className="mt-3 space-y-1">
          {images.map((img, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
              <span className="truncate">{img.name}</span>
              <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))} className="text-red-500">
                Remove
              </button>
            </div>
          ))}
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
              <span className="truncate">{f.name} ({formatBytes(f.size)})</span>
              <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="text-red-500">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <ErrorMessage message={error} />

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Posting...' : isNews ? 'Publish news' : 'Post'}
        </Button>
      </div>
    </form>
  )
}
