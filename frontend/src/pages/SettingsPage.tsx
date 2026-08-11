import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { userApi, roleApi, clubApi, apiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Input, Field } from '../components/ui/Input'
import Button from '../components/ui/Button'
import ErrorMessage from '../components/ui/ErrorMessage'
import Avatar from '../components/ui/Avatar'
import { AVATAR_STYLES } from '../utils/avatar'
import type { Role, Club } from '../types'

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const [username, setUsername] = useState('')
  const [yearRoles, setYearRoles] = useState<Role[]>([])
  const [yearRoleId, setYearRoleId] = useState<number | null>(null)
  const [profilePicture, setProfilePicture] = useState(1)
  const [clubs, setClubs] = useState<Club[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setUsername(user.username)
    setYearRoleId(user.year_role_id)
    setProfilePicture(user.profile_picture)
    roleApi.list('year').then(setYearRoles).catch(() => {})
    clubApi.list().then(setClubs).catch(() => {})
  }, [user])

  if (!user) return null
  const currentUser = user

  const userClubIds = new Set((currentUser.roles ?? []).filter((r) => r.role_type === 'club').map((r) => r.id))

  async function saveProfile() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await userApi.updateProfile({
        username: username.trim() !== currentUser.username ? username.trim() : undefined,
        profile_picture: profilePicture !== currentUser.profile_picture ? profilePicture : undefined,
      })
      setUser(updated)
      setUsername(updated.username)
      setSuccess('Profile updated')
    } catch (e) {
      setError(apiError(e))
    } finally {
      setSaving(false)
    }
  }

  async function saveYearRole() {
    setError('')
    setSuccess('')
    try {
      const updated = await userApi.updateYearRole(yearRoleId)
      setUser(updated)
      setSuccess('Year role updated')
    } catch (e) {
      setError(apiError(e))
    }
  }

  async function joinClub(club: Club) {
    if (!club.role_id) return
    try {
      await clubApi.join(club.id)
      const updated = await userApi.updateProfile({})
      setUser(updated)
    } catch (e) {
      setError(apiError(e))
    }
  }

  async function leaveClub(club: Club) {
    try {
      await clubApi.leave(club.id)
      const updated = await userApi.updateProfile({})
      setUser(updated)
    } catch (e) {
      setError(apiError(e))
    }
  }

  async function savePassword() {
    setPwError('')
    setPwSuccess('')
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match')
      return
    }
    setPwSaving(true)
    try {
      await userApi.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwSuccess('Password changed. Please log in again.')
    } catch (e) {
      setPwError(apiError(e))
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Settings — taugether</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

        <ErrorMessage message={error} />
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Profile */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-gray-900">Profile</h2>
          <div className="mt-4 space-y-4">
            <Field label="Username">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={30}
              />
            </Field>

            <Field label="Profile picture">
              <div className="flex flex-wrap gap-3">
                {AVATAR_STYLES.slice(1).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setProfilePicture(i + 1)}
                    className={`rounded-full p-0.5 transition ${
                      profilePicture === i + 1 ? 'ring-2 ring-primary-600 ring-offset-2' : 'hover:opacity-80'
                    }`}
                  >
                    <Avatar username={String(i + 1)} profilePicture={i + 1} size="lg" />
                  </button>
                ))}
              </div>
            </Field>

            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save profile'}
              </Button>
            </div>
          </div>
        </section>

        {/* Year role */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-gray-900">Year role</h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose which year you are in. You can only have one year role.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {yearRoles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setYearRoleId(role.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  yearRoleId === role.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {role.name}
              </button>
            ))}
            {yearRoleId !== null && (
              <button
                type="button"
                onClick={() => setYearRoleId(null)}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Remove year role
              </button>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={saveYearRole}>
              Update year role
            </Button>
          </div>
        </section>

        {/* Clubs */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-gray-900">My clubs</h2>
          <p className="mt-1 text-sm text-gray-500">
            You can be a member of as many clubs as you like.
          </p>
          <div className="mt-4 space-y-2">
            {clubs.length === 0 && <p className="text-sm text-gray-400">No clubs available.</p>}
            {clubs.map((club) => {
              const joined = club.role_id != null && userClubIds.has(club.role_id)
              return (
                <div key={club.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{ backgroundColor: club.role?.color || '#DC2626' }}
                    >
                      {club.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{club.name}</span>
                  </div>
                  {joined ? (
                    <Button variant="outline" size="sm" onClick={() => leaveClub(club)}>
                      Leave
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => joinClub(club)}>
                      Join
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Password */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-gray-900">Change password</h2>
          <div className="mt-4 space-y-4">
            <Field label="Current password">
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <Field label="New password">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <ErrorMessage message={pwError} />
            {pwSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {pwSuccess}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                variant="danger"
                onClick={savePassword}
                disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
              >
                {pwSaving ? 'Changing...' : 'Change password'}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
