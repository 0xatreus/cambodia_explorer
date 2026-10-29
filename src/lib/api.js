async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  if (response.status === 204) return null
  const text = await response.text().catch(() => '')
  let payload = {}
  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    payload = {}
  }
  if (!response.ok) {
    const fallback = response.status >= 500 && !payload.error
      ? 'Cannot reach the API server (port 8787). Make sure the backend is running (npm run dev:full).'
      : 'Request failed.'
    const error = new Error(payload.error || fallback)
    error.status = response.status
    error.payload = payload
    throw error
  }
  return payload
}

export const api = {
  me: () => request('/api/auth/me'),
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  listTrips: () => request('/api/trips'),
  createTrip: (body) => request('/api/trips', { method: 'POST', body: JSON.stringify(body) }),
  updateTrip: (id, body) => request(`/api/trips/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTrip: (id) => request(`/api/trips/${id}`, { method: 'DELETE' }),
  communityPlaces: () => request('/api/community-places'),
  mySuggestions: () => request('/api/suggestions/mine'),
  notifications: () => request('/api/notifications'),
  markNotificationRead: id => request(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/api/notifications/read-all', { method: 'POST' }),
  createSuggestion: body => request('/api/suggestions', { method: 'POST', body: JSON.stringify(body) }),
  updateSuggestion: (id, body) => request(`/api/suggestions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSuggestion: id => request(`/api/suggestions/${id}`, { method: 'DELETE' }),
  uploadPhoto: file => request('/api/suggestions/photo', { method: 'POST', headers: { 'Content-Type': file.type }, body: file }),
  likeSuggestion: (id, liked) => request(`/api/suggestions/${id}/like`, { method: liked ? 'POST' : 'DELETE' }),
  adminOverview: () => request('/api/admin/overview'),
  adminSuggestions: (params = {}) => {
    if (typeof params === 'string') return request(`/api/admin/suggestions?status=${encodeURIComponent(params)}`)
    const { status = 'pending', q = '', page = 1 } = params
    return request(`/api/admin/suggestions?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&page=${page}`)
  },
  adminEditSuggestion: (id, body) => request(`/api/admin/suggestions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  reviewSuggestion: (id, body) => request(`/api/admin/suggestions/${id}/review`, { method: 'POST', body: JSON.stringify(body) }),
  adminDeleteSuggestion: id => request(`/api/admin/suggestions/${id}`, { method: 'DELETE' }),
  adminUsers: ({ q = '', page = 1 } = {}) => request(`/api/admin/users?q=${encodeURIComponent(q)}&page=${page}`),
  adminSetUserRole: (id, role) => request(`/api/admin/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role }) }),
  adminSetUserStatus: (id, disabled) => request(`/api/admin/users/${id}/status`, { method: 'POST', body: JSON.stringify({ disabled }) }),
  adminDeleteUser: id => request(`/api/admin/users/${id}`, { method: 'DELETE' }),
  adminTrips: ({ q = '', page = 1 } = {}) => request(`/api/admin/trips?q=${encodeURIComponent(q)}&page=${page}`),
  adminAuditLog: ({ page = 1 } = {}) => request(`/api/admin/audit-log?page=${page}`),
}
