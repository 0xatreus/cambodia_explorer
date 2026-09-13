async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  if (response.status === 204) return null
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Request failed.')
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
}
