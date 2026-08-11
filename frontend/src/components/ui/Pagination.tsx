import Button from './Button'

interface PaginationProps {
  offset: number
  limit: number
  hasMore: boolean
  onPrev: () => void
  onNext: () => void
}

export default function Pagination({ offset, limit, hasMore, onPrev, onNext }: PaginationProps) {
  if (offset === 0 && !hasMore) return null
  return (
    <div className="flex items-center justify-center gap-4 py-6">
      <Button variant="outline" disabled={offset === 0} onClick={onPrev}>
        Previous
      </Button>
      <span className="text-sm text-gray-500">Page {Math.floor(offset / limit) + 1}</span>
      <Button variant="outline" disabled={!hasMore} onClick={onNext}>
        Next
      </Button>
    </div>
  )
}
