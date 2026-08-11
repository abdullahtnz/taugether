import { useState } from 'react'
import { postApi, apiError } from '../../api/client'
import Modal from '../ui/Modal'
import ErrorMessage from '../ui/ErrorMessage'

interface ReportModalProps {
  open: boolean
  onClose: () => void
  postId: string
  onReported: () => void
  onUpdate?: () => void
}

export default function ReportModal({ open, onClose, postId, onReported, onUpdate }: ReportModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      await postApi.report(postId, reason.trim())
      setReason('')
      onReported()
      onUpdate?.()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Report post">
      <ErrorMessage message={error} />
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        Reason (optional)
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={4}
        maxLength={500}
        placeholder="Tell us why this post should be reviewed..."
        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? 'Reporting...' : 'Report post'}
        </button>
      </div>
    </Modal>
  )
}
