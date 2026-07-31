import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/categories', label: 'Categories', icon: '🗂️' },
  { to: '/admin/products', label: 'Products', icon: '🎇' },
  { to: '/admin/orders', label: 'Orders', icon: '📦' },
  { to: '/admin/offers', label: 'Offers', icon: '🏷️' },
  { to: '/admin/finance', label: 'Finance', icon: '💰' },
  { to: '/admin/calls', label: 'Calls', icon: '📞' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen flex bg-sandal-50">
      <aside className="w-60 bg-brand-900 text-sandal-100 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-brand-800">
          <p className="font-extrabold text-white text-lg">🎆 Crackers CRM</p>
        </div>
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-brand-500 text-white' : 'text-sandal-200 hover:bg-brand-800'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-brand-800">
          <p className="text-xs text-sandal-300">Signed in as</p>
          <p className="font-semibold text-white text-sm truncate">{user?.full_name || user?.username}</p>
          <p className="text-xs text-sandal-300 capitalize mb-3">{user?.role}</p>
          <button onClick={handleLogout} className="w-full text-xs font-semibold bg-brand-800 hover:bg-brand-700 text-white rounded-lg py-2">
            Log Out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
