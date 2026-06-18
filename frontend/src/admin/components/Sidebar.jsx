import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import t from '../api/i18n'

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const { lang, toggle, isAr } = useLang()
  const navigate = useNavigate()
  const T = t[lang]

  const links = [
    { to: '/admin',          label: T.dashboard, icon: '📊' },
    { to: '/admin/products', label: T.products,  icon: '📦' },
    { to: '/admin/orders',   label: T.orders,    icon: '📝' },
    { to: '/admin/settings', label: T.settings,  icon: '⚙️' }, 
  ]
  return (
    <aside 
      className="w-56 min-h-screen bg-zinc-900 text-zinc-100 flex flex-col fixed top-0 z-30"
      style={{ left: isAr ? 'auto' : 0, right: isAr ? 0 : 'auto' }}
    >
      {/* Brand Header */}
      <div className="px-6 py-5 border-b border-zinc-800">
        <span className={`text-lg font-semibold tracking-wide ${isAr ? 'font-arabic text-right block' : ''}`}>
          {T.brand}
        </span>
        <span className={`text-xs text-zinc-500 block mt-0.5 ${isAr ? 'text-right' : ''}`}>
          {T.adminDashboard}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors group
              ${isAr ? 'flex-row-reverse text-right' : 'text-left'}
              ${isActive ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`
            }
          >
            {/* Rigid box to anchor icons in a perfectly uniform straight line */}
            <span className="w-6 h-6 flex items-center justify-center shrink-0 text-base select-none">
              {icon}
            </span>
            
            {/* Text label container without any font clipping filters */}
            <span className="truncate align-middle py-0.5">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Language Toggle */}
      <div className="px-4 py-3 border-t border-zinc-800">
        <button
          onClick={toggle}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors ${isAr ? 'flex-row-reverse' : ''}`}
        >
          <span className="text-xs text-zinc-400">
            {lang === 'en' ? 'English' : 'العربية'}
          </span>
          <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
            {lang === 'en' ? 'AR' : 'EN'}
          </span>
        </button>
      </div>

      {/* User Status Block */}
      <div className="px-4 py-4 border-t border-zinc-800">
        <div className={`text-xs text-zinc-500 truncate mb-2 ${isAr ? 'text-right' : 'text-left'}`}>
          {user?.email}
        </div>
        <button
          onClick={() => { signOut(); navigate('/admin/login') }}
          className={`w-full text-xs text-zinc-400 hover:text-red-400 transition-colors py-1 ${isAr ? 'text-right' : 'text-left'}`}
        >
          {T.signOut}
        </button>
      </div>
    </aside>
  )
}