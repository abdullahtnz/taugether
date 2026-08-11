import { useCallback, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { adminApi, tagApi, roleApi, clubApi, postApi, apiError } from '../api/client'
import type { Report, Tag, Role, Club, Post } from '../types'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import ErrorMessage from '../components/ui/ErrorMessage'
import TagBadge from '../components/ui/TagBadge'
import { PageLoader } from '../components/ui/Spinner'
import { timeAgo } from '../utils/format'
import PostForm from '../components/post/PostForm'

type Tab = 'reports' | 'posts' | 'tags' | 'roles' | 'clubs' | 'news'

const tabs: { key: Tab; label: string }[] = [
  { key: 'reports', label: 'Reports' },
  { key: 'posts', label: 'Posts' },
  { key: 'tags', label: 'Tags' },
  { key: 'roles', label: 'Roles' },
  { key: 'clubs', label: 'Clubs' },
  { key: 'news', label: 'News' },
]

const COLOR_PRESETS = ['#DC2626', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280', '#0EA5E9']

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('reports')

  return (
    <>
      <Helmet>
        <title>Admin panel — taugether</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Admin panel</h1>

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === t.key ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 shadow-sm hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'reports' && <ReportsTab />}
        {tab === 'posts' && <PostsTab />}
        {tab === 'tags' && <TagsTab />}
        {tab === 'roles' && <RolesTab />}
        {tab === 'clubs' && <ClubsTab />}
        {tab === 'news' && <NewsTab />}
      </div>
    </>
  )
}

// ---------------- Reports ----------------

function ReportsTab() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    adminApi
      .reports()
      .then((data) => {
        setReports(data)
        setError('')
      })
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  async function resolve(id: string) {
    try {
      await adminApi.resolveReport(id)
      load()
    } catch (e) {
      setError(apiError(e))
    }
  }

  async function deletePost(id: string, reportId: string) {
    if (!window.confirm('Delete this post and resolve its reports?')) return
    try {
      await adminApi.deletePost(id)
      await adminApi.resolveReport(reportId)
      load()
    } catch (e) {
      setError(apiError(e))
    }
  }

  if (loading) return <PageLoader />
  if (error) return <ErrorMessage message={error} />
  if (reports.length === 0) {
    return <div className="rounded-xl bg-white py-16 text-center text-gray-400">No reported posts.</div>
  }

  return (
    <div className="space-y-4">
      {reports.map((rep) => (
        <div key={rep.id} className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{rep.reporter.username}</span>
            reported <span className="font-semibold text-gray-700">{rep.post.author.username}</span>'s post
            <span className="ml-auto text-xs">{timeAgo(rep.created_at)}</span>
          </div>
          {rep.reason && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">"{rep.reason}"</p>
          )}
          <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-gray-400">ID: {rep.post.id}</span>
              <TagBadge tag={rep.post.tag} />
            </div>
            <p className="mt-1 font-semibold text-gray-900">{rep.post.title}</p>
            {rep.post.content && (
              <p className="mt-1 line-clamp-3 text-sm text-gray-600">{rep.post.content}</p>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="danger" size="sm" onClick={() => deletePost(rep.post.id, rep.id)}>
              Delete post
            </Button>
            <Button variant="outline" size="sm" onClick={() => resolve(rep.id)}>
              Resolve without action
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------- Posts ----------------

function PostsTab() {
  const [post, setPost] = useState<Post | null>(null)
  const [id, setId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function lookup() {
    if (!id.trim()) return
    setLoading(true)
    setError('')
    try {
      const p = await postApi.get(id.trim())
      setPost(p)
    } catch (e) {
      setError(apiError(e))
      setPost(null)
    } finally {
      setLoading(false)
    }
  }

  async function deletePost() {
    if (!post || !window.confirm('Delete this post?')) return
    try {
      await adminApi.deletePost(post.id)
      setPost(null)
      setId('')
    } catch (e) {
      setError(apiError(e))
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="font-bold text-gray-900">Find a post by ID</h2>
      <p className="mt-1 text-sm text-gray-500">
        Post IDs are shown next to posts when you are logged in as an admin.
      </p>
      <div className="mt-4 flex gap-2">
        <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="Post UUID" />
        <Button onClick={lookup} disabled={loading || !id.trim()}>
          {loading ? 'Looking up...' : 'Look up'}
        </Button>
      </div>
      <ErrorMessage message={error} />

      {post && (
        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-400">ID: {post.id}</span>
            <TagBadge tag={post.tag} />
          </div>
          <p className="mt-2 text-lg font-bold text-gray-900">{post.title}</p>
          <p className="mt-1 text-sm text-gray-600">
            by {post.author.username} · {timeAgo(post.created_at)} · {post.like_count} likes ·{' '}
            {post.comment_count} comments
          </p>
          {post.content && <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{post.content}</p>}
          <div className="mt-3 flex gap-2">
            <Button variant="danger" size="sm" onClick={deletePost}>
              Delete post
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------- Tags ----------------

function TagsTab() {
  const [tags, setTags] = useState<Tag[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    tagApi.list().then(setTags).catch((e) => setError(apiError(e))).finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  async function create() {
    if (!name.trim()) return
    setError('')
    try {
      await tagApi.create(name.trim())
      setName('')
      load()
    } catch (e) {
      setError(apiError(e))
    }
  }

  async function rename(tag: Tag) {
    const newName = window.prompt('New tag name:', tag.name)
    if (!newName || newName.trim() === tag.name) return
    try {
      await tagApi.rename(tag.id, newName.trim())
      load()
    } catch (e) {
      setError(apiError(e))
    }
  }

  async function remove(tag: Tag) {
    if (!window.confirm(`Delete tag "${tag.name}"?`)) return
    try {
      await tagApi.remove(tag.id)
      load()
    } catch (e) {
      setError(apiError(e))
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="font-bold text-gray-900">Manage tags</h2>
      <div className="mt-4 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag name" />
        <Button onClick={create} disabled={!name.trim()}>
          Add tag
        </Button>
      </div>
      <ErrorMessage message={error} />
      <div className="mt-4 space-y-2">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <TagBadge tag={tag} />
              <span className="text-xs text-gray-400">ID {tag.id}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => rename(tag)}>
                Rename
              </Button>
              <Button variant="danger" size="sm" onClick={() => remove(tag)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------- Roles ----------------

function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('#DC2626')
  const [roleType, setRoleType] = useState<'year' | 'club'>('year')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    roleApi.list().then(setRoles).catch((e) => setError(apiError(e))).finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  async function create() {
    if (!name.trim()) return
    setError('')
    try {
      await roleApi.create({ name: name.trim(), color, role_type: roleType })
      setName('')
      setColor('#DC2626')
      load()
    } catch (e) {
      setError(apiError(e))
    }
  }

  async function edit(role: Role) {
    const newName = window.prompt('New role name:', role.name)
    if (!newName || newName.trim() === role.name) return
    try {
      await roleApi.update(role.id, { name: newName.trim(), color: role.color })
      load()
    } catch (e) {
      setError(apiError(e))
    }
  }

  async function editColor(role: Role) {
    const newColor = window.prompt('New role color (hex):', role.color)
    if (!newColor || !/^#[0-9A-Fa-f]{6}$/.test(newColor.trim())) return
    try {
      await roleApi.update(role.id, { name: role.name, color: newColor.trim() })
      load()
    } catch (e) {
      setError(apiError(e))
    }
  }

  async function remove(role: Role) {
    if (!window.confirm(`Delete role "${role.name}"?`)) return
    try {
      await roleApi.remove(role.id)
      load()
    } catch (e) {
      setError(apiError(e))
    }
  }

  if (loading) return <PageLoader />

  const yearRoles = roles.filter((r) => r.role_type === 'year')
  const clubRoles = roles.filter((r) => r.role_type === 'club')

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="font-bold text-gray-900">Manage roles</h2>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-40">
          <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Role name" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-16 rounded-lg border border-gray-300 bg-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Type</label>
          <select
            value={roleType}
            onChange={(e) => setRoleType(e.target.value as 'year' | 'club')}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="year">Year</option>
            <option value="club">Club</option>
          </select>
        </div>
        <Button onClick={create} disabled={!name.trim()}>
          Add role
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-full ${color === c ? 'ring-2 ring-gray-700 ring-offset-1' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <ErrorMessage message={error} />

      {yearRoles.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-gray-600">Year roles</h3>
          <div className="mt-2 space-y-2">
            {yearRoles.map((role) => (
              <div key={role.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: role.color }} />
                  <span className="text-sm font-medium text-gray-800">{role.name}</span>
                  <span className="text-xs text-gray-400">ID {role.id}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => edit(role)}>Rename</Button>
                  <Button variant="outline" size="sm" onClick={() => editColor(role)}>Color</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(role)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {clubRoles.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-gray-600">Club roles</h3>
          <div className="mt-2 space-y-2">
            {clubRoles.map((role) => (
              <div key={role.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: role.color }} />
                  <span className="text-sm font-medium text-gray-800">{role.name}</span>
                  <span className="text-xs text-gray-400">ID {role.id}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => edit(role)}>Rename</Button>
                  <Button variant="outline" size="sm" onClick={() => editColor(role)}>Color</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(role)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------- Clubs ----------------

function ClubsTab() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#DC2626')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    clubApi.list().then(setClubs).catch((e) => setError(apiError(e))).finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  async function create() {
    if (!name.trim()) return
    setError('')
    try {
      await clubApi.create({ name: name.trim(), description: description.trim(), color })
      setName('')
      setDescription('')
      setColor('#DC2626')
      load()
    } catch (e) {
      setError(apiError(e))
    }
  }

  async function edit(club: Club) {
    const newName = window.prompt('New club name:', club.name)
    if (!newName || newName.trim() === club.name) return
    try {
      await clubApi.update(club.id, {
        name: newName.trim(),
        description: club.description,
        color: club.role?.color || '#DC2626',
      })
      load()
    } catch (e) {
      setError(apiError(e))
    }
  }

  async function remove(club: Club) {
    if (!window.confirm(`Delete club "${club.name}" and its role?`)) return
    try {
      await clubApi.remove(club.id)
      load()
    } catch (e) {
      setError(apiError(e))
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="font-bold text-gray-900">Manage clubs</h2>
      <div className="mt-4 space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Club name" />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Club description"
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-16 rounded-lg border border-gray-300 bg-white"
          />
          <Button onClick={create} disabled={!name.trim()}>
            Create club
          </Button>
        </div>
      </div>
      <ErrorMessage message={error} />
      <div className="mt-5 space-y-2">
        {clubs.length === 0 && <p className="text-sm text-gray-400">No clubs yet.</p>}
        {clubs.map((club) => (
          <div key={club.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: club.role?.color || '#DC2626' }} />
              <span className="text-sm font-medium text-gray-800">{club.name}</span>
              <span className="text-xs text-gray-400">{club.member_count} members · ID {club.id}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => edit(club)}>Edit</Button>
              <Button variant="danger" size="sm" onClick={() => remove(club)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------- News ----------------

function NewsTab() {
  const [tags, setTags] = useState<Tag[]>([])

  useEffect(() => {
    tagApi.list().then(setTags).catch(() => {})
  }, [])

  return (
    <div>
      <PostForm tags={tags} isNews onCreated={() => window.alert('News published!')} />
    </div>
  )
}
