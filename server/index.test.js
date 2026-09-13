import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'

process.env.CE_DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { default: app } = await import('./index.cjs')
const { default: db } = await import('./db.cjs')

function resetDb() {
  db.exec('DELETE FROM sessions; DELETE FROM trips; DELETE FROM users;')
}

// authRateLimit is keyed by IP and shared across register+login. Each test gets its own
// fake IP (trust proxy is enabled) so tests don't trip each other's rate-limit bucket.
let ipCounter = 0
function nextIp() {
  ipCounter += 1
  return `10.0.0.${ipCounter}`
}

const credentials = { username: 'traveler1', email: 'traveler1@example.com', password: 'hunter2hunter2' }

function register(ip, overrides = {}) {
  return request(app).post('/api/auth/register').set('X-Forwarded-For', ip).send({ ...credentials, ...overrides })
}

function login(ip, overrides = {}) {
  return request(app).post('/api/auth/login').set('X-Forwarded-For', ip).send({ email: credentials.email, password: credentials.password, ...overrides })
}

async function registerAndLogin(agent, ip, overrides = {}) {
  const user = { ...credentials, ...overrides }
  await agent.post('/api/auth/register').set('X-Forwarded-For', ip).send(user)
  return user
}

describe('server/index.cjs', () => {
  beforeEach(resetDb)

  it('GET /api/health returns ok', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
  })

  describe('registration', () => {
    it('registers a new user and sets a session cookie', async () => {
      const response = await register(nextIp())
      expect(response.status).toBe(201)
      expect(response.body.user).toMatchObject({ username: credentials.username, email: credentials.email })
      expect(response.headers['set-cookie'][0]).toMatch(/^ce_session=/)
    })

    it('rejects a duplicate email/username with 409', async () => {
      const ip = nextIp()
      await register(ip)
      const response = await register(ip)
      expect(response.status).toBe(409)
    })

    it('rejects an invalid payload with 400', async () => {
      const response = await register(nextIp(), { username: 'a', email: 'not-an-email', password: 'short' })
      expect(response.status).toBe(400)
    })
  })

  describe('login', () => {
    it('logs in with correct credentials', async () => {
      const ip = nextIp()
      await register(ip)
      const response = await login(ip)
      expect(response.status).toBe(200)
      expect(response.body.user.email).toBe(credentials.email)
    })

    it('returns the same generic error for a wrong password and a nonexistent email', async () => {
      const ip = nextIp()
      await register(ip)
      const wrongPassword = await login(ip, { password: 'wrong-password' })
      const noSuchUser = await login(ip, { email: 'nobody@example.com' })
      expect(wrongPassword.status).toBe(401)
      expect(noSuchUser.status).toBe(401)
      expect(wrongPassword.body.error).toBe(noSuchUser.body.error)
    })
  })

  describe('/api/auth/me', () => {
    it('returns null when no session cookie is present', async () => {
      const response = await request(app).get('/api/auth/me')
      expect(response.body.user).toBeNull()
    })

    it('returns the user when a valid session cookie is present', async () => {
      const agent = request.agent(app)
      await registerAndLogin(agent, nextIp())
      const response = await agent.get('/api/auth/me')
      expect(response.body.user).toMatchObject({ email: credentials.email })
    })
  })

  describe('trips', () => {
    it('requires auth for all trip routes', async () => {
      expect((await request(app).get('/api/trips')).status).toBe(401)
      expect((await request(app).post('/api/trips').send({})).status).toBe(401)
      expect((await request(app).put('/api/trips/1').send({})).status).toBe(401)
      expect((await request(app).delete('/api/trips/1')).status).toBe(401)
    })

    it('creates, lists, updates and deletes a trip for the authenticated user', async () => {
      const agent = request.agent(app)
      await registerAndLogin(agent, nextIp())

      const created = await agent.post('/api/trips').send({ name: 'Temples', days: 4, tier: 'value', placeIds: ['angkor-wat'] })
      expect(created.status).toBe(201)
      const tripId = created.body.trip.id

      const listed = await agent.get('/api/trips')
      expect(listed.body.trips).toHaveLength(1)
      expect(listed.body.trips[0].id).toBe(tripId)

      const updated = await agent.put(`/api/trips/${tripId}`).send({ name: 'Temples v2', days: 5, tier: 'comfort', placeIds: [] })
      expect(updated.status).toBe(200)
      expect(updated.body.trip.name).toBe('Temples v2')

      const deleted = await agent.delete(`/api/trips/${tripId}`)
      expect(deleted.status).toBe(204)

      const listedAfterDelete = await agent.get('/api/trips')
      expect(listedAfterDelete.body.trips).toHaveLength(0)
    })

    it('returns 404 updating or deleting a trip that does not belong to the caller', async () => {
      const owner = request.agent(app)
      await registerAndLogin(owner, nextIp())
      const created = await owner.post('/api/trips').send({ name: 'Temples', days: 4, tier: 'value', placeIds: [] })
      const tripId = created.body.trip.id

      const intruder = request.agent(app)
      await registerAndLogin(intruder, nextIp(), { username: 'intruder1', email: 'intruder1@example.com' })

      expect((await intruder.put(`/api/trips/${tripId}`).send({ name: 'Hijacked', days: 1, tier: 'value', placeIds: [] })).status).toBe(404)
      expect((await intruder.delete(`/api/trips/${tripId}`)).status).toBe(404)
    })

    it('rejects an invalid trip payload with 400', async () => {
      const agent = request.agent(app)
      await registerAndLogin(agent, nextIp())
      const response = await agent.post('/api/trips').send({ name: '', days: 999, tier: 'unknown', placeIds: [] })
      expect(response.status).toBe(400)
    })
  })

  describe('rate limiting', () => {
    it('returns 429 after exceeding the auth rate limit', async () => {
      const ip = nextIp()
      const attempts = []
      for (let i = 0; i < 11; i += 1) {
        attempts.push(await login(ip, { email: 'nobody@example.com', password: 'wrong' }))
      }
      expect(attempts.some(response => response.status === 429)).toBe(true)
    })
  })
})
