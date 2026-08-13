import api from './client'

// ---- Public storefront ----
export const CategoriesAPI = {
  list: () => api.get('/categories/'),
}

export const ProductsAPI = {
  list: (params) => api.get('/products/', { params }),
  detail: (id) => api.get(`/products/${id}/`),
  create: (formData) => api.post('/products/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.patch(`/products/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => api.delete(`/products/${id}/`),
  uploadImage: (id, file, isPrimary = false) => {
    const fd = new FormData()
    fd.append('image', file)
    fd.append('is_primary', isPrimary)
    return api.post(`/products/${id}/upload_image/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  deleteImage: (productId, imageId) => api.delete(`/products/${productId}/images/${imageId}/`),
}

export const OffersAPI = {
  active: () => api.get('/offers/active/'),
  list: (params) => api.get('/offers/', { params }),
  create: (data) => api.post('/offers/', data),
  update: (id, data) => api.patch(`/offers/${id}/`, data),
  remove: (id) => api.delete(`/offers/${id}/`),
  uploadBannerImage: (id, file) => {
    const fd = new FormData()
    fd.append('image', file)
    return api.post(`/offers/${id}/upload_banner_image/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export const OrdersAPI = {
  checkout: (payload) => api.post('/orders/checkout/', payload, { skipErrorToast: true }),
  myOrders: (phone) => api.get('/orders/my-orders/', { params: { phone } }),
  invoiceByToken: (token) => api.get(`/orders/invoice/${token}/`),
  // admin
  list: (params) => api.get('/orders/', { params }),
  detail: (id) => api.get(`/orders/${id}/`),
  updateStatus: (id, payload) => api.post(`/orders/${id}/update-status/`, payload),
  downloadInvoice: (id) => api.get(`/orders/${id}/download-invoice/`, { responseType: 'blob' }),
}

// ---- Admin CRM only ----
export const AuthAPI = {
  login: (username, password) => api.post('/auth/login/', { username, password }, { skipErrorToast: true }),
  me: () => api.get('/auth/me/'),
  users: {
    list: () => api.get('/auth/users/'),
    create: (data) => api.post('/auth/users/', data, { skipErrorToast: true }),
    update: (id, data) => api.patch(`/auth/users/${id}/`, data, { skipErrorToast: true }),
    remove: (id) => api.delete(`/auth/users/${id}/`),
  },
}

export const CategoriesAdminAPI = {
  list: (params) => api.get('/categories/', { params }),
  create: (formData) => api.post('/categories/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.patch(`/categories/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => api.delete(`/categories/${id}/`),
}

export const CustomersAPI = {
  list: (params) => api.get('/customers/', { params }),
}

export const CallsAPI = {
  orders: (params) => api.get('/calls/orders/', { params }),
  history: (orderId) => api.get('/calls/', { params: { order: orderId, ordering: 'created_at' } }),
  list: (params) => api.get('/calls/', { params }),
  create: (data) => api.post('/calls/', data),
  update: (id, data) => api.patch(`/calls/${id}/`, data),
  remove: (id) => api.delete(`/calls/${id}/`),
}

export const FinanceAPI = {
  summary: (params) => api.get('/finance/summary/', { params }),
  trend: (months = 6) => api.get('/finance/trend/', { params: { months } }),
  exportExcel: (params) => api.get('/finance/export/', { params, responseType: 'blob' }),
  list: (params) => api.get('/finance/', { params }),
  create: (data) => api.post('/finance/', data),
  update: (id, data) => api.patch(`/finance/${id}/`, data),
  remove: (id) => api.delete(`/finance/${id}/`),
}

export const DashboardAPI = {
  overview: (days = 30) => api.get('/dashboard/overview/', { params: { days } }),
}

export const SettingsAPI = {
  list: (params) => api.get('/settings/', { params }),
  create: (data) => api.post('/settings/', data),
  update: (id, data) => api.patch(`/settings/${id}/`, data),
  remove: (id) => api.delete(`/settings/${id}/`),
}

export const StaffAPI = {
  departments: {
    list: (p) => api.get('/staff/departments/', { params: p }),
    create: (d) => api.post('/staff/departments/', d),
    update: (id, d) => api.patch(`/staff/departments/${id}/`, d),
    remove: (id) => api.delete(`/staff/departments/${id}/`),
  },
  shifts: {
    list: (p) => api.get('/staff/shifts/', { params: p }),
    create: (d) => api.post('/staff/shifts/', d),
    update: (id, d) => api.patch(`/staff/shifts/${id}/`, d),
    remove: (id) => api.delete(`/staff/shifts/${id}/`),
  },
  employees: {
    list: (p) => api.get('/staff/employees/', { params: p }),
    detail: (id) => api.get(`/staff/employees/${id}/`),
    create: (fd) => api.post('/staff/employees/', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    update: (id, fd) => api.patch(`/staff/employees/${id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    remove: (id) => api.delete(`/staff/employees/${id}/`),
    attendanceCalendar: (id, p) => api.get(`/staff/employees/${id}/attendance_calendar/`, { params: p }),
    paymentHistory: (id) => api.get(`/staff/employees/${id}/payment_history/`),
  },
  attendance: {
    list: (p) => api.get('/staff/attendance/', { params: p }),
    create: (d) => api.post('/staff/attendance/', d),
    update: (id, d) => api.patch(`/staff/attendance/${id}/`, d),
    remove: (id) => api.delete(`/staff/attendance/${id}/`),
    byDate: (date) => api.get('/staff/attendance/by_date/', { params: { date } }),
    monthlySummary: (p) => api.get('/staff/attendance/monthly_summary/', { params: p }),
  },
  payments: {
    list: (p) => api.get('/staff/payments/', { params: p }),
    create: (d) => api.post('/staff/payments/', d),
    update: (id, d) => api.patch(`/staff/payments/${id}/`, d),
    remove: (id) => api.delete(`/staff/payments/${id}/`),
  },
}
