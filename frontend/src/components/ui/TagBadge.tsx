import type { Tag } from '../../types'

const tagColors: Record<string, string> = {
  Exam: 'bg-orange-100 text-orange-700',
  Study: 'bg-green-100 text-green-700',
  University: 'bg-blue-100 text-blue-700',
  Question: 'bg-purple-100 text-purple-700',
}

export default function TagBadge({ tag }: { tag: Tag }) {
  const color = tagColors[tag.name] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${color}`}>
      {tag.name}
    </span>
  )
}
