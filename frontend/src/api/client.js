import axios from 'axios'
import { getGlobalToast } from '../context/ToastContext.jsx'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

// Best-effort human-readable message out of a DRF error response — {detail: "..."},
// {field: ["msg"]}, {non_field_errors: ["msg"]}, a plain string, or no response at all.
function extractErrorMessage(error) {
  if (!error.response) return 'Network error — check your connection and try again.'
  const data = error.response.data
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') {
    if (data.detail) return data.detail
    const firstKey = Object.keys(data)[0]
    if (firstKey) {
      const val = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey]
      return firstKey === 'non_field_errors' ? val : `${firstKey.replace(/_/g, ' ')}: ${val}`
    }
  }
  return `Request failed (${error.response.status})`
}

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

    // Safety net so a failed request is never silent — pages that already show
    // their own inline error can opt out with { skipErrorToast: true } in the
    // request config, to avoid showing the same failure twice.
    if (error.response?.status !== 401 && !original?.skipErrorToast) {
      getGlobalToast()?.error(extractErrorMessage(error))
    }
    return Promise.reject(error)
  }
)

export default api
