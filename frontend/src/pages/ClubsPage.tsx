import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { clubApi, apiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Club } from '../types'
import { PageLoader } from '../components/ui/Spinner'
import ErrorMessage from '../components/ui/ErrorMessage'

export default function ClubsPage() {
  const { user } = useAuth()
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    clubApi
      .list()
      .then((data) => {
        setClubs(data)
        setError('')
      })
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false))
  }, [])

  const userClubIds = new Set(
    (user?.roles ?? []).filter((r) => r.role_type === 'club').map((r) => r.id)
  )

  return (
    <>
      <Helmet>
        <title>Clubs — taugether</title>
        <meta
          name="description"
          content="Discover and join student clubs at Türkiye-Azerbaijan University — football, tennis, books and more."
        />
      </Helmet>

      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Student clubs</h1>
          <p className="text-sm text-gray-500">
            Join a club to add its role to your profile and connect with members.
          </p>
        </div>

        <ErrorMessage message={error} />

        {loading ? (
          <PageLoader />
        ) : clubs.length === 0 ? (
          <div className="rounded-xl bg-white py-16 text-center text-gray-400">
            No clubs yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => {
              const joined = club.role_id != null && userClubIds.has(club.role_id)
              return (
                <Link
                  key={club.id}
                  to={`/clubs/${club.id}`}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-extrabold text-white"
                      style={{ backgroundColor: club.role?.color || '#DC2626' }}
                    >
                      {club.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-gray-900">{club.name}</h2>
                      <p className="text-xs text-gray-500">
                        {club.member_count} member{club.member_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    {joined && (
                      <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Member
                      </span>
                    )}
                  </div>
                  {club.description && (
                    <p className="mt-3 line-clamp-3 text-sm text-gray-600">{club.description}</p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
