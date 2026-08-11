import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../context/AuthContext'
import { apiError } from '../api/client'
import { Input, Field } from '../components/ui/Input'
import Button from '../components/ui/Button'
import ErrorMessage from '../components/ui/ErrorMessage'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(identifier.trim(), password)
      navigate('/feed')
    } catch (err) {
      setError(apiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Log in — taugether</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="mx-auto mt-10 max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-xl font-extrabold text-white">
              t
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-500">Log in to your taugether account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Username or email">
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="username or email"
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </Field>

            <ErrorMessage message={error} />

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Logging in...' : 'Log in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-semibold text-primary-600 hover:text-primary-700">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
