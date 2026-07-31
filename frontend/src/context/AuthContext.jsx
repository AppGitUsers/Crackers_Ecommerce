import { createContext, useContext, useEffect, useState } from 'react'
import { AuthAPI } from '../api/endpoints'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_access_token')
    if (!token) {
      setLoading(false)
      return
    }
    AuthAPI.me()
      .then(({ data }) => setUser(data))
      .catch(() => {
        localStorage.removeItem('admin_access_token')
        localStorage.removeItem('admin_refresh_token')
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(username, password) {
    const { data } = await AuthAPI.login(username, password)
    localStorage.setItem('admin_access_token', data.access)
    localStorage.setItem('admin_refresh_token', data.refresh)
    setUser(data.user)
    return data.user
  }

  function logout() {
    localStorage.removeItem('admin_access_token')
    localStorage.removeItem('admin_refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
