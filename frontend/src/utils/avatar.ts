export const AVATAR_STYLES = [
  { bg: '#DC2626', fg: '#FFFFFF', label: 'A' }, // default / red letter
  { bg: '#3B82F6', fg: '#FFFFFF', label: 'B' }, // blue
  { bg: '#10B981', fg: '#FFFFFF', label: 'C' }, // green
  { bg: '#F59E0B', fg: '#1F2937', label: 'D' }, // amber
  { bg: '#8B5CF6', fg: '#FFFFFF', label: 'E' }, // violet
  { bg: '#EC4899', fg: '#FFFFFF', label: 'F' }, // pink
]

export function avatarStyle(index: number) {
  const style = AVATAR_STYLES[Math.max(0, Math.min(5, index))]
  return { backgroundColor: style.bg, color: style.fg }
}

export function avatarLabel(index: number) {
  return AVATAR_STYLES[Math.max(0, Math.min(5, index))].label
}

export function initialFor(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}

export function defaultAvatarColor(name: string): string {
  const colors = ['#DC2626', '#B91C1C', '#991B1B', '#7F1D1D']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return colors[Math.abs(hash) % colors.length]
}

// Returns CSS background for a user avatar based on profile_picture + username.
export function avatarBackground(profilePicture: number, username: string): string {
  if (profilePicture === 0) return defaultAvatarColor(username)
  return avatarStyle(profilePicture).backgroundColor
}
