import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'

const tagCards = [
  { name: 'Exam', desc: 'Past papers, tips and exam discussions', icon: '📝' },
  { name: 'Study', desc: 'Share notes and study together', icon: '📚' },
  { name: 'University', desc: 'Campus life, events and announcements', icon: '🏛️' },
  { name: 'Question', desc: 'Ask anything, get answers fast', icon: '❓' },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <>
      <Helmet>
        <title>taugether — Student Community of Türkiye–Azerbaijan University</title>
        <meta
          name="description"
          content="Find classmates, share study notes, discuss exams, join clubs and follow university news on taugether — the community platform of Türkiye-Azerbaijan University."
        />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 to-primary-900 px-6 py-16 text-center text-white sm:px-12 sm:py-24">
        <div className="relative z-10 mx-auto max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Together, we study better.
          </h1>
          <p className="mt-4 text-lg text-red-100">
            The community platform for students of Türkiye–Azerbaijan University. Share notes,
            discuss exams, find your classmates and join student clubs — all in one place.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {user ? (
              <Button size="lg" onClick={() => (window.location.href = '/feed')}>
                Go to the feed
              </Button>
            ) : (
              <>
                <Link to="/signup">
                  <Button size="lg">Join taugether</Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="border-white/50 bg-transparent text-red hover:bg-white/10 hover:text-white">
                    Log in
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Tags */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900">Everything your community needs</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tagCards.map((tag) => (
            <Link
              key={tag.name}
              to={`/feed?tag=${tag.name}`}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-3xl">{tag.icon}</div>
              <h3 className="mt-3 font-bold text-gray-900">{tag.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{tag.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mt-12 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="font-bold text-gray-900">🎯 Find classmates</h3>
          <p className="mt-2 text-sm text-gray-500">
            See who is in your year and which clubs you share. Connect before the year even starts.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="font-bold text-gray-900">🗂️ Save study material</h3>
          <p className="mt-2 text-sm text-gray-500">
            Upload and download notes, files and images. Bookmark the posts you want to keep.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="font-bold text-gray-900">👥 Join clubs</h3>
          <p className="mt-2 text-sm text-gray-500">
            Football, tennis, books and more. Add club roles to your profile and meet new people.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-12 rounded-3xl bg-gray-900 px-6 py-12 text-center">
        <h2 className="text-2xl font-bold text-white">Ready to join the TAU community?</h2>
        <p className="mt-2 text-gray-400">
          Create your account in less than a minute.
        </p>
        <div className="mt-6">
          <Link to="/signup">
            <Button size="lg">Create your account</Button>
          </Link>
        </div>
      </section>
    </>
  )
}
