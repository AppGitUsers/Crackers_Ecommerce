import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="p-10 text-center text-brand-700">Loading…</div>
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return children
}
