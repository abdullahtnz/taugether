import { avatarBackground, avatarLabel } from '../../utils/avatar'

interface AvatarProps {
  username: string
  profilePicture: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-xl',
  xl: 'h-24 w-24 text-3xl',
}

export default function Avatar({ username, profilePicture, size = 'md', className = '' }: AvatarProps) {
  if (profilePicture === 0) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${sizes[size]} ${className}`}
        style={{ backgroundColor: avatarBackground(0, username) }}
        aria-label={username}
      >
        {username.charAt(0).toUpperCase()}
      </div>
    )
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${sizes[size]} ${className}`}
      style={{ backgroundColor: avatarBackground(profilePicture, username) }}
      aria-label={username}
    >
      {avatarLabel(profilePicture)}
    </div>
  )
}
