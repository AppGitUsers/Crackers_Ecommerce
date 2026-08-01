import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderTree, PartyPopper, Package, Tag, Wallet, Phone, LogOut,
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

  function handleLogout() {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen flex bg-sandal-50">
      <aside className="w-60 bg-ink-900 text-sandal-200 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-ink-700 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
            <PartyPopper size={18} className="text-gold-400" />
          </div>
          <p className="font-extrabold text-white text-base leading-tight">Crackers CRM</p>
        </div>
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
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

      <div className="flex-1 min-w-0">
        <main className="p-6">
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
