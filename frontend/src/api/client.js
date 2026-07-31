import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

// Attach the admin JWT (if present) to every request. Public storefront
// endpoints ignore it, admin-only endpoints require it.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On a 401, try one silent refresh before giving up (admin session expiry).
let isRefreshing = false

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && localStorage.getItem('admin_refresh_token')) {
      original._retry = true
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const refresh = localStorage.getItem('admin_refresh_token')
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh })
          localStorage.setItem('admin_access_token', data.access)
        } catch (e) {
          localStorage.removeItem('admin_access_token')
          localStorage.removeItem('admin_refresh_token')
          window.location.href = '/admin/login'
        } finally {
          isRefreshing = false
        }
      }
      original.headers.Authorization = `Bearer ${localStorage.getItem('admin_access_token')}`
      return api(original)
    }
    return Promise.reject(error)
  }
)

export default api
