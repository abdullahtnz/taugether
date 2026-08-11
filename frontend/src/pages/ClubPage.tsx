import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { clubApi, authApi, apiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Club, UserBrief } from '../types'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { PageLoader } from '../components/ui/Spinner'
import ErrorMessage from '../components/ui/ErrorMessage'

export default function ClubPage() {
  const { id } = useParams<{ id: string }>()
  const { user, setUser } = useAuth()
  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<UserBrief[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([clubApi.get(Number(id)), clubApi.members(Number(id))])
      .then(([c, m]) => {
        if (cancelled) return
        setClub(c)
        setMembers(m)
        setError('')
      })
      .catch((e) => !cancelled && setError(apiError(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id])

  const isMember = club?.role_id != null && (user?.roles ?? []).some((r) => r.id === club.role_id)

  async function join() {
    if (!club || !user) return
    setBusy(true)
    try {
      await clubApi.join(club.id)
      const data = await authApi.me()
      setUser(data)
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  async function leave() {
    if (!club) return
    setBusy(true)
    try {
      await clubApi.leave(club.id)
      const data = await authApi.me()
      setUser(data)
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoader />
  if (error || !club) {
    return (
      <div className="py-16 text-center">
        <ErrorMessage message={error || 'Club not found'} />
        <Link to="/clubs" className="mt-4 inline-block text-primary-600 hover:underline">
          Back to clubs
        </Link>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>{club.name} club — taugether</title>
        <meta name="description" content={`${club.name} student club at Türkiye-Azerbaijan University. ${club.description}`} />
      </Helmet>

      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-extrabold text-white"
              style={{ backgroundColor: club.role?.color || '#DC2626' }}
            >
              {club.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{club.name}</h1>
              <p className="text-sm text-gray-500">
                {club.member_count} member{club.member_count === 1 ? '' : 's'}
              </p>
            </div>
            {user &&
              (isMember ? (
                <Button variant="outline" onClick={leave} disabled={busy}>
                  Leave club
                </Button>
              ) : (
                <Button onClick={join} disabled={busy}>
                  Join club
                </Button>
              ))}
          </div>
          {club.description && (
            <p className="mt-4 whitespace-pre-line text-gray-700">{club.description}</p>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-gray-900">Members ({members.length})</h2>
          {members.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">No members yet.</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {members.map((m) => (
                <Link
                  key={m.id}
                  to={`/profile/${m.username}`}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                >
                  <Avatar username={m.username} profilePicture={m.profile_picture} size="md" />
                  <span className="font-medium text-gray-800">{m.username}</span>
                  {m.is_admin && (
                    <span className="rounded bg-primary-100 px-1 text-[10px] font-bold text-primary-700">
                      ADMIN
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
