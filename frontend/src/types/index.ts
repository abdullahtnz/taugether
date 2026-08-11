export interface Role {
  id: number
  name: string
  color: string
  role_type: 'year' | 'club'
  position: number
}

export interface Tag {
  id: number
  name: string
}

export interface UserBrief {
  id: string
  username: string
  profile_picture: number
  is_admin: boolean
}

export interface User {
  id: string
  username: string
  email?: string
  profile_picture: number
  is_admin: boolean
  year_role_id: number | null
  year_role?: Role | null
  roles?: Role[]
  post_count?: number
  created_at: string
}

export interface Image {
  id: string
  file_name: string
  url: string
  original_name: string
  size: number
}

export interface File {
  id: string
  file_name: string
  url: string
  original_name: string
  size: number
}

export interface Post {
  id: string
  author: UserBrief
  tag_id: number
  tag: Tag
  title: string
  content: string
  is_news: boolean
  is_edited: boolean
  like_count: number
  comment_count: number
  is_liked: boolean
  is_bookmarked: boolean
  images: Image[]
  files: File[]
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  post_id: string
  author: UserBrief
  parent_id: string | null
  content: string
  depth: number
  created_at: string
  updated_at: string
  replies?: Comment[]
}

export interface Club {
  id: number
  name: string
  description: string
  role_id: number | null
  role?: Role | null
  member_count: number
}

export interface Report {
  id: string
  post: Post
  reporter: UserBrief
  reason: string
  is_resolved: boolean
  created_at: string
}

export interface Notification {
  id: string
  type: 'comment' | 'reply' | 'like'
  post_id: string | null
  comment_id: string | null
  actor: UserBrief
  is_read: boolean
  created_at: string
  post_title?: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}
