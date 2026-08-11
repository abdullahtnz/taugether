import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi, tokenStore, apiError } from '../api/client'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<void>
  signup: (payload: {
    username: string
    email: string
    password: string
    profile_picture: number
    year_role_id: number | null
    accepted_terms: boolean
  }) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const token = tokenStore.getAccess()
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const me = await authApi.me()
        if (!cancelled) setUser(me)
      } catch {
        if (!cancelled) {
          tokenStore.clear()
          setUser(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await authApi.login(identifier, password)
    tokenStore.set(res.access_token, res.refresh_token)
    setUser(res.user)
  }, [])

  const signup = useCallback(
    async (payload: {
      username: string
      email: string
      password: string
      profile_picture: number
      year_role_id: number | null
      accepted_terms: boolean
    }) => {
      const res = await authApi.signup(payload)
      tokenStore.set(res.access_token, res.refresh_token)
      setUser(res.user)
    },
    []
  )

  const logout = useCallback(() => {
    authApi.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, setUser }),
    [user, loading, login, signup, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { apiError }
