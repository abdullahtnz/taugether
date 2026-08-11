import axios, { AxiosError } from 'axios'
import type {
  AuthResponse,
  User,
  Post,
  Comment,
  Tag,
  Role,
  Club,
  UserBrief,
  Notification,
  Report,
} from '../types'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

const ACCESS_KEY = 'taugether_access'
const REFRESH_KEY = 'taugether_refresh'

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh()
  if (!refresh) return null
  try {
    const { data } = await axios.post<AuthResponse>(`${API_URL}/auth/refresh`, {
      refresh_token: refresh,
    })
    tokenStore.set(data.access_token, data.refresh_token)
    return data.access_token
  } catch {
    tokenStore.clear()
    return null
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }
      const newToken = await refreshPromise
      if (newToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` }
        return api(original)
      }
    }
    return Promise.reject(error)
  }
)

export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined
    if (data?.error) return data.error
    if (error.code === 'ERR_NETWORK') return 'Cannot reach the server'
  }
  return 'Something went wrong'
}

// ---- Auth ----
export const authApi = {
  signup: (payload: {
    username: string
    email: string
    password: string
    profile_picture: number
    year_role_id: number | null
    accepted_terms: boolean
  }) => api.post<AuthResponse>('/auth/signup', payload).then((r) => r.data),

  login: (identifier: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { identifier, password }).then((r) => r.data),

  logout: () => {
    const refresh = tokenStore.getRefresh()
    if (refresh) api.post('/auth/logout', { refresh_token: refresh }).catch(() => {})
    tokenStore.clear()
  },

  me: () => api.get<User>('/me').then((r) => r.data),
}

// ---- Users ----
export const userApi = {
  getByUsername: (username: string) =>
    api.get<User>(`/users/${username}`).then((r) => r.data),
  updateProfile: (payload: { username?: string; profile_picture?: number }) =>
    api.put<User>('/me', payload).then((r) => r.data),
  updateYearRole: (year_role_id: number | null) =>
    api.put<User>('/me/year-role', { year_role_id }).then((r) => r.data),
  changePassword: (current_password: string, new_password: string) =>
    api.put('/me/password', { current_password, new_password }).then((r) => r.data),
  userPosts: (username: string, offset = 0, limit = 10) =>
    api.get<Post[]>(`/users/${username}/posts`, { params: { offset, limit } }).then((r) => r.data),
}

// ---- Posts ----
export interface PostListParams {
  tag?: string
  q?: string
  offset?: number
  limit?: number
}

export const postApi = {
  list: (params: PostListParams = {}) =>
    api.get<Post[]>('/posts', { params }).then((r) => r.data),
  get: (id: string) => api.get<Post>(`/posts/${id}`).then((r) => r.data),
  create: (form: FormData) =>
    api.post<Post>('/posts', form).then((r) => r.data),
  createJson: (payload: { title: string; content: string; tag_id: number }) =>
    api.post<Post>('/posts', payload).then((r) => r.data),
  update: (id: string, payload: { title: string; content: string; tag_id: number }) =>
    api.put<Post>(`/posts/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/posts/${id}`).then((r) => r.data),
  toggleLike: (id: string) =>
    api.post<{ liked: boolean }>(`/posts/${id}/like`).then((r) => r.data),
  report: (id: string, reason: string) =>
    api.post(`/posts/${id}/report`, { reason }).then((r) => r.data),
  toggleBookmark: (id: string) =>
    api.post<{ bookmarked: boolean }>(`/posts/${id}/bookmark`).then((r) => r.data),
  bookmarks: (offset = 0, limit = 10) =>
    api.get<Post[]>('/me/bookmarks', { params: { offset, limit } }).then((r) => r.data),
  comments: (id: string) =>
    api.get<Comment[]>(`/posts/${id}/comments`).then((r) => r.data),
  addComment: (id: string, content: string, parent_id: string | null) =>
    api.post<Comment>(`/posts/${id}/comments`, { content, parent_id }).then((r) => r.data),
  deleteComment: (id: string) => api.delete(`/comments/${id}`).then((r) => r.data),
}

// ---- News ----
export const newsApi = {
  list: (offset = 0, limit = 10) =>
    api.get<Post[]>('/news', { params: { offset, limit } }).then((r) => r.data),
  create: (form: FormData) =>
    api.post<Post>('/news', form).then((r) => r.data),
}

// ---- Tags ----
export const tagApi = {
  list: () => api.get<Tag[]>('/tags').then((r) => r.data),
  create: (name: string) => api.post<Tag>('/tags', { name }).then((r) => r.data),
  rename: (id: number, name: string) => api.put(`/tags/${id}`, { name }).then((r) => r.data),
  remove: (id: number) => api.delete(`/tags/${id}`).then((r) => r.data),
}

// ---- Roles ----
export const roleApi = {
  list: (type?: string) => api.get<Role[]>('/roles', { params: { type } }).then((r) => r.data),
  create: (payload: { name: string; color: string; role_type: string; position?: number }) =>
    api.post<Role>('/roles', payload).then((r) => r.data),
  update: (id: number, payload: { name: string; color: string; position?: number }) =>
    api.put(`/roles/${id}`, payload).then((r) => r.data),
  remove: (id: number) => api.delete(`/roles/${id}`).then((r) => r.data),
}

// ---- Clubs ----
export const clubApi = {
  list: () => api.get<Club[]>('/clubs').then((r) => r.data),
  get: (id: number) => api.get<Club>(`/clubs/${id}`).then((r) => r.data),
  members: (id: number) => api.get<UserBrief[]>(`/clubs/${id}/members`).then((r) => r.data),
  join: (id: number) => api.post(`/clubs/${id}/join`).then((r) => r.data),
  leave: (id: number) => api.post(`/clubs/${id}/leave`).then((r) => r.data),
  create: (payload: { name: string; description: string; color: string }) =>
    api.post<Club>('/clubs', payload).then((r) => r.data),
  update: (id: number, payload: { name: string; description: string; color: string }) =>
    api.put(`/clubs/${id}`, payload).then((r) => r.data),
  remove: (id: number) => api.delete(`/clubs/${id}`).then((r) => r.data),
}

// ---- Search ----
export const searchApi = {
  posts: (q: string, offset = 0, limit = 10) =>
    api.get<Post[]>('/search', { params: { q, offset, limit } }).then((r) => r.data),
}

// ---- Admin ----
export const adminApi = {
  reports: () => api.get<Report[]>('/admin/reports').then((r) => r.data),
  resolveReport: (id: string) => api.post(`/admin/reports/${id}/resolve`).then((r) => r.data),
  deletePost: (id: string) => api.delete(`/admin/posts/${id}`).then((r) => r.data),
}

// ---- Notifications ----
export const notificationApi = {
  list: (offset = 0, limit = 20) =>
    api
      .get<{ notifications: Notification[]; unread: number }>('/me/notifications', {
        params: { offset, limit },
      })
      .then((r) => r.data),
  markRead: () => api.post('/me/notifications/read').then((r) => r.data),
}
