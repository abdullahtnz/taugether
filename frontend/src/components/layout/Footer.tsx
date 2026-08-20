import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 font-extrabold text-white">
                tg
              </div>
              <span className="text-lg font-extrabold text-gray-900">
                tau<span className="text-primary-600">gether</span>
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-gray-500">
              The community platform for students of Türkiye–Azerbaijan University. Share notes,
              discuss exams, find classmates and join clubs.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Community</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li><Link to="/feed" className="hover:text-primary-600">Post feed</Link></li>
              <li><Link to="/news" className="hover:text-primary-600">University news</Link></li>
              <li><Link to="/clubs" className="hover:text-primary-600">Clubs</Link></li>
              <li><Link to="/search" className="hover:text-primary-600">Search</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Account</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li><Link to="/login" className="hover:text-primary-600">Log in</Link></li>
              <li><Link to="/signup" className="hover:text-primary-600">Sign up</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} taugether.org — Made for the students of Türkiye–Azerbaijan University.
          <span className="mx-2">·</span>
          <Link to="/terms" className="hover:text-primary-600">Terms of Service</Link>
          <span className="mx-2">·</span>
          <Link to="/privacy" className="hover:text-primary-600">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  )
}
