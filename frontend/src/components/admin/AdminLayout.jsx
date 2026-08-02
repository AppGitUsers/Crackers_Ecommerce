import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderTree, PartyPopper, Package, Tag, Wallet, Phone, LogOut, Menu, X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ConfirmDialog } from './ui.jsx'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/products', label: 'Products', icon: PartyPopper },
  { to: '/admin/orders', label: 'Orders', icon: Package },
  { to: '/admin/offers', label: 'Offers', icon: Tag },
  { to: '/admin/finance', label: 'Finance', icon: Wallet },
  { to: '/admin/calls', label: 'Calls', icon: Phone },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-sandal-50">
      {/* Mobile/tablet backdrop, shown while the drawer is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Fixed to the viewport at every size — its height is always exactly
          the viewport height, so it never stretches or scrolls with the page. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-ink-900 text-sandal-200 flex flex-col shrink-0
          transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-5 py-5 border-b border-ink-700 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
              <PartyPopper size={18} className="text-gold-400" />
            </div>
            <p className="font-extrabold text-white text-base leading-tight truncate">Crackers CRM</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-ink-400 hover:text-white hover:bg-ink-800 transition-colors shrink-0"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={17} className="shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-ink-700">
          <p className="text-xs text-ink-400">Signed in as</p>
          <p className="font-semibold text-white text-sm truncate">{user?.full_name || user?.username}</p>
          <p className="text-xs text-ink-400 capitalize mb-3">{user?.role}</p>
          <button
            onClick={() => setConfirmLogout(true)}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 transition-colors"
          >
            <LogOut size={14} />
            Log Out
          </button>
        </div>
      </aside>

      <div className="min-w-0 lg:ml-64">
        {/* Mobile/tablet top bar — gives access to the drawer once it's closed */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-sandal-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-ink-600 hover:bg-sandal-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <p className="font-bold text-ink-900 text-sm truncate">Crackers CRM</p>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
        title="Log out"
        message="You'll need to sign in again to access the admin panel."
        danger={false}
      />
    </div>
  )
}
