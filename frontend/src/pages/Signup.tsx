import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../context/AuthContext'
import { roleApi, apiError } from '../api/client'
import { Input, Field } from '../components/ui/Input'
import Button from '../components/ui/Button'
import ErrorMessage from '../components/ui/ErrorMessage'
import Avatar from '../components/ui/Avatar'
import { AVATAR_STYLES } from '../utils/avatar'
import type { Role } from '../types'

const PASSWORD_RULES = [
  { re: /.{8,}/, label: 'At least 8 characters' },
  { re: /[A-Z]/, label: 'An uppercase letter' },
  { re: /[a-z]/, label: 'A lowercase letter' },
  { re: /[0-9]/, label: 'A number' },
  { re: /[^A-Za-z0-9]/, label: 'A special character' },
]

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [profilePicture, setProfilePicture] = useState(1)
  const [yearRoleId, setYearRoleId] = useState<number | null>(null)
  const [yearRoles, setYearRoles] = useState<Role[]>([])
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    roleApi.list('year').then((roles) => setYearRoles(roles)).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreeTerms || !agreePrivacy) {
      setError('You must agree to the Terms of Service and Privacy Policy to sign up.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await signup({ username: username.trim(), email: email.trim(), password, profile_picture: profilePicture, year_role_id: yearRoleId, accepted_terms: agreed })
      navigate('/feed')
    } catch (err) {
      setError(apiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const agreed = agreeTerms && agreePrivacy
  const strength = PASSWORD_RULES.filter((r) => r.re.test(password)).length

  return (
    <>
      <Helmet>
        <title>Sign up — taugether</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="mx-auto mt-8 max-w-lg">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-xl font-extrabold text-white">
              t
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Join taugether</h1>
            <p className="mt-1 text-sm text-gray-500">
              The community for TAU students
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Username">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="3-30 characters"
                autoComplete="username"
                minLength={3}
                maxLength={30}
                required
              />
            </Field>

            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@tau.edu.tr"
                autoComplete="email"
                required
              />
            </Field>

            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.re.test(password)
                  return (
                    <span
                      key={rule.label}
                      className={`text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {ok ? '✓' : '○'} {rule.label}
                    </span>
                  )
                })}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full transition-all ${
                    strength <= 2 ? 'bg-red-500' : strength <= 4 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${(strength / 5) * 100}%` }}
                />
              </div>
            </Field>

            <Field label="Your year">
              <select
                value={yearRoleId ?? ''}
                onChange={(e) => setYearRoleId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                <option value="">Select your year...</option>
                {yearRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Choose your profile picture">
              <div className="flex flex-wrap gap-3">
                {AVATAR_STYLES.slice(1).map((style, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setProfilePicture(i + 1)}
                    className={`rounded-full p-0.5 transition ${
                      profilePicture === i + 1 ? 'ring-2 ring-primary-600 ring-offset-2' : 'hover:opacity-80'
                    }`}
                    aria-label={`Avatar ${i + 1}`}
                  >
                    <Avatar username={style.label} profilePicture={i + 1} size="lg" />
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                You can change this later from your profile.
              </p>
            </Field>

            <ErrorMessage message={error} />

            {/* Agreements */}
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs leading-relaxed text-gray-600">
                  I have read and agree to the{' '}
                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary-600 hover:text-primary-700"
                  >
                    Terms of Service
                  </Link>
                  . I understand that I am responsible for my actions and for everything I post on
                  taugether.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs leading-relaxed text-gray-600">
                  I have read and agree to the{' '}
                  <Link
                    to="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary-600 hover:text-primary-700"
                  >
                    Privacy Policy
                  </Link>{' '}
                  and I consent to my account data being processed as described there.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !agreed}
              title={agreed ? undefined : 'Agree to the Terms of Service and Privacy Policy to continue'}
            >
              {submitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
