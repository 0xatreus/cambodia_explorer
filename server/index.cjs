const crypto = require('node:crypto')
const express = require('express')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const bcrypt = require('bcryptjs')
const db = require('./db.cjs')

const app = express()
const port = Number(process.env.PORT || 8787)
const isProduction = process.env.NODE_ENV === 'production'
const host = isProduction ? '0.0.0.0' : '127.0.0.1'
const sessionMaxAge = 1000 * 60 * 60 * 24 * 30
const cookieName = 'ce_session'
const allowedTiers = new Set(['value', 'comfort', 'flash'])
const DUMMY_HASH = bcrypt.hashSync('cambodia-explorer-timing-safe-placeholder', 12)

app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://*.tile.openstreetmap.org'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}))
app.use(express.json({ limit: '32kb' }))

const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false })

function toSqliteDatetime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

function cleanupExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run()
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map(cookie => {
    const separator = cookie.indexOf('=')
    const key = cookie.slice(0, separator).trim()
    try {
      return [key, decodeURIComponent(cookie.slice(separator + 1).trim())]
    } catch {
      return [key, '']
    }
  }))
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function setSessionCookie(response, token) {
  response.setHeader('Set-Cookie', `${cookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${sessionMaxAge / 1000}${isProduction ? '; Secure' : ''}`)
}

function clearSessionCookie(response) {
  response.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`)
}

function publicUser(user) {
  return { id: user.id, username: user.username, email: user.email }
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = toSqliteDatetime(new Date(Date.now() + sessionMaxAge))
  db.prepare('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(userId, hashToken(token), expiresAt)
  return token
}

function getAuthenticatedUser(request) {
  const token = parseCookies(request)[cookieName]
  if (!token) return null
  const row = db.prepare(`
    SELECT users.id, users.username, users.email
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > datetime('now')
  `).get(hashToken(token))
  return row || null
}

function requireAuth(request, response, next) {
  const user = getAuthenticatedUser(request)
  if (!user) return response.status(401).json({ error: 'Please sign in to continue.' })
  request.user = user
  return next()
}

function validateTrip(input) {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const days = Number(input.days)
  const tier = input.tier
  const placeIds = Array.isArray(input.placeIds) ? [...new Set(input.placeIds.filter(id => typeof id === 'string'))] : []
  if (!name || name.length > 80) return { error: 'Trip name must be between 1 and 80 characters.' }
  if (!Number.isInteger(days) || days < 1 || days > 21) return { error: 'Trip length must be between 1 and 21 days.' }
  if (!allowedTiers.has(tier)) return { error: 'Choose a valid budget tier.' }
  if (placeIds.length > 100) return { error: 'A trip can contain at most 100 places.' }
  return { name, days, tier, placeIds }
}

app.get('/api/health', (request, response) => response.json({ ok: true }))

app.post('/api/auth/register', authRateLimit, async (request, response) => {
  const body = request.body || {}
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return response.status(400).json({ error: 'Username must be 3-24 letters, numbers, or underscores.' })
  if (!/^\S+@\S+\.\S+$/.test(email)) return response.status(400).json({ error: 'Enter a valid email address.' })
  if (password.length < 8 || password.length > 128) return response.status(400).json({ error: 'Password must be 8-128 characters.' })
  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const result = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run(username, email, passwordHash)
    const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(result.lastInsertRowid)
    setSessionCookie(response, createSession(user.id))
    return response.status(201).json({ user: publicUser(user) })
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return response.status(409).json({ error: 'That username or email is already registered.' })
    throw error
  }
})

app.post('/api/auth/login', authRateLimit, async (request, response) => {
  const body = request.body || {}
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const user = db.prepare('SELECT id, username, email, password_hash FROM users WHERE email = ?').get(email)
  const passwordMatches = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH)
  if (!user || !passwordMatches) return response.status(401).json({ error: 'Email or password is incorrect.' })
  cleanupExpiredSessions()
  setSessionCookie(response, createSession(user.id))
  return response.json({ user: publicUser(user) })
})

app.post('/api/auth/logout', (request, response) => {
  const token = parseCookies(request)[cookieName]
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
  clearSessionCookie(response)
  return response.status(204).end()
})

app.get('/api/auth/me', (request, response) => {
  const user = getAuthenticatedUser(request)
  return response.json({ user: user ? publicUser(user) : null })
})

app.get('/api/trips', requireAuth, (request, response) => {
  const trips = db.prepare('SELECT id, name, days, tier, place_ids, created_at, updated_at FROM trips WHERE user_id = ? ORDER BY updated_at DESC').all(request.user.id)
  return response.json({ trips: trips.map(serializeTrip) })
})

app.post('/api/trips', requireAuth, (request, response) => {
  const trip = validateTrip(request.body || {})
  if (trip.error) return response.status(400).json({ error: trip.error })
  const result = db.prepare('INSERT INTO trips (user_id, name, days, tier, place_ids, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)').run(request.user.id, trip.name, trip.days, trip.tier, JSON.stringify(trip.placeIds))
  const savedTrip = db.prepare('SELECT id, name, days, tier, place_ids, created_at, updated_at FROM trips WHERE id = ? AND user_id = ?').get(result.lastInsertRowid, request.user.id)
  return response.status(201).json({ trip: serializeTrip(savedTrip) })
})

app.put('/api/trips/:id', requireAuth, (request, response) => {
  const trip = validateTrip(request.body || {})
  if (trip.error) return response.status(400).json({ error: trip.error })
  const result = db.prepare('UPDATE trips SET name = ?, days = ?, tier = ?, place_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(trip.name, trip.days, trip.tier, JSON.stringify(trip.placeIds), request.params.id, request.user.id)
  if (!result.changes) return response.status(404).json({ error: 'Trip not found.' })
  const savedTrip = db.prepare('SELECT id, name, days, tier, place_ids, created_at, updated_at FROM trips WHERE id = ? AND user_id = ?').get(request.params.id, request.user.id)
  return response.json({ trip: serializeTrip(savedTrip) })
})

app.delete('/api/trips/:id', requireAuth, (request, response) => {
  const result = db.prepare('DELETE FROM trips WHERE id = ? AND user_id = ?').run(request.params.id, request.user.id)
  if (!result.changes) return response.status(404).json({ error: 'Trip not found.' })
  return response.status(204).end()
})

function serializeTrip(trip) {
  return { id: trip.id, name: trip.name, days: trip.days, tier: trip.tier, placeIds: JSON.parse(trip.place_ids), createdAt: trip.created_at, updatedAt: trip.updated_at }
}

app.use((error, request, response, next) => {
  console.error(error)
  response.status(500).json({ error: 'Something went wrong on the server.' })
})

cleanupExpiredSessions()
app.listen(port, host, () => console.log(`Cambodia Explorer API listening on http://${host}:${port}`))
