// @vitest-environment node
import { createRequire } from 'node:module'
import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'

process.env.CE_DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const require = createRequire(import.meta.url)
const app = require('./index.cjs')
const db = require('./db.cjs')

let ipCounter = 0
const nextIp = () => `10.2.0.${++ipCounter}`

function resetDb() {
  db.exec('DELETE FROM notifications; DELETE FROM admin_audit_log; DELETE FROM suggestion_likes; DELETE FROM suggestions; DELETE FROM trips; DELETE FROM sessions; DELETE FROM users;')
}

async function signedInAgent(username = 'user01', { admin = false } = {}) {
  const agent = request.agent(app)
  const response = await agent
    .post('/api/auth/register')
    .set('X-Forwarded-For', nextIp())
    .send({ username, email: `${username}@example.com`, password: 'hunter2hunter2' })
  expect(response.status).toBe(201)
  if (admin) {
    db.prepare("UPDATE users SET role = 'admin', is_admin = 1 WHERE username = ?").run(username)
  }
  return { agent, user: response.body.user }
}

const sampleSuggestion = {
  name: 'Wat Bo quiet lane cafe',
  category: 'Food',
  lat: 13.356,
  lng: 103.862,
  description: 'Shaded courtyard coffee near the pagoda.',
  tags: ['local-go-to', 'food'],
}

describe('admin dashboard API & middleware', () => {
  beforeEach(resetDb)

  it('rejects unauthenticated and non-admin requests across all admin routes', async () => {
    const { agent: userAgent } = await signedInAgent('regular_user')
    const endpoints = [
      ['get', '/api/admin/overview'],
      ['get', '/api/admin/suggestions'],
      ['put', '/api/admin/suggestions/1'],
      ['post', '/api/admin/suggestions/1/review'],
      ['delete', '/api/admin/suggestions/1'],
      ['get', '/api/admin/users'],
      ['post', '/api/admin/users/1/role'],
      ['post', '/api/admin/users/1/status'],
      ['delete', '/api/admin/users/1'],
      ['get', '/api/admin/trips'],
      ['get', '/api/admin/audit-log'],
    ]

    for (const [method, url] of endpoints) {
      const unauth = await request(app)[method](url)
      expect(unauth.status).toBe(401)
      const nonAdmin = await userAgent[method](url).send({})
      expect(nonAdmin.status).toBe(403)
    }
  })

  it('promotes accounts matching CE_ADMIN_EMAILS on registration', async () => {
    process.env.CE_ADMIN_EMAILS = 'firstadmin@example.com, second@example.com'
    try {
      const response = await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', nextIp())
        .send({ username: 'firstadmin', email: 'FirstAdmin@example.com', password: 'hunter2hunter2' })
      expect(response.status).toBe(201)
      expect(response.body.user).toMatchObject({ role: 'admin', isAdmin: true })
    } finally {
      delete process.env.CE_ADMIN_EMAILS
    }
  })

  it('returns overview counts, most-saved places, and most-suggested provinces', async () => {
    const { agent: userAgent } = await signedInAgent('traveler_a')
    const { agent: adminAgent } = await signedInAgent('admin_a', { admin: true })

    await userAgent.post('/api/trips').send({ name: 'Siem Reap starter', days: 3, tier: 'value', placeIds: ['angkor-wat', 'bayon-temple'] })
    await userAgent.post('/api/suggestions').send(sampleSuggestion)

    const overview = await adminAgent.get('/api/admin/overview')
    expect(overview.status).toBe(200)
    expect(overview.body.counts).toMatchObject({
      users: 2,
      activeUsers: 2,
      disabledUsers: 0,
      admins: 1,
      trips: 1,
      suggestions: { pending: 1, approved: 0, rejected: 0 },
      signupsLast30Days: 2,
    })
    expect(overview.body.mostSavedPlaces[0]).toMatchObject({ id: 'angkor-wat', count: 1 })
    expect(overview.body.mostSuggestedProvinces[0]).toMatchObject({ province: 'Siem Reap', count: 1 })
  })

  it('flags catalog duplicates, allows editing before approval, and records audit logs', async () => {
    const { agent: userAgent } = await signedInAgent('submitter_b')
    const { agent: adminAgent } = await signedInAgent('admin_b', { admin: true })

    // Near Angkor Wat (13.4125, 103.8667) with a similar name
    const created = await userAgent.post('/api/suggestions').send({
      name: 'Angkor Wat sunrise',
      category: 'Sights',
      lat: 13.4126,
      lng: 103.8668,
      description: 'Right by the west causeway.',
      tags: ['must-see'],
    })
    expect(created.status).toBe(201)
    const id = created.body.suggestion.id

    const queue = await adminAgent.get('/api/admin/suggestions?status=pending')
    expect(queue.status).toBe(200)
    expect(queue.body.suggestions[0].duplicates.some(d => d.source === 'catalog')).toBe(true)

    const edited = await adminAgent.put(`/api/admin/suggestions/${id}`).send({
      name: 'West Causeway Reflective Pond',
      category: 'Sights',
      province: 'Siem Reap',
      lat: 13.4126,
      lng: 103.8668,
      description: 'Quiet reflection spot before entering the main gate.',
      tags: ['must-see', 'culture'],
    })
    expect(edited.status).toBe(200)
    expect(edited.body.suggestion.name).toBe('West Causeway Reflective Pond')

    const approved = await adminAgent.post(`/api/admin/suggestions/${id}/review`).send({ decision: 'approved' })
    expect(approved.status).toBe(200)
    expect(approved.body.suggestion.status).toBe('approved')

    const inbox = await userAgent.get('/api/notifications')
    expect(inbox.status).toBe(200)
    expect(inbox.body.unreadCount).toBe(1)
    expect(inbox.body.notifications[0]).toMatchObject({
      type: 'suggestion_approved',
      suggestionId: id,
      emailSent: true,
    })

    const markRead = await userAgent.post(`/api/notifications/${inbox.body.notifications[0].id}/read`)
    expect(markRead.status).toBe(200)
    const inboxAfter = await userAgent.get('/api/notifications')
    expect(inboxAfter.body.unreadCount).toBe(0)

    const community = await request(app).get('/api/community-places')
    expect(community.body.places).toMatchObject([{ id, name: 'West Causeway Reflective Pond' }])

    const logs = await adminAgent.get('/api/admin/audit-log')
    expect(logs.body.logs.map(l => l.action)).toEqual(['suggestion.approve', 'suggestion.edit'])
  })

  it('disables a user, invalidates their active session immediately, and prevents login', async () => {
    const { agent: userAgent, user } = await signedInAgent('target_user')
    const { agent: adminAgent } = await signedInAgent('admin_c', { admin: true })

    // Verify user never exposes password_hash
    const usersList = await adminAgent.get('/api/admin/users?q=target_user')
    expect(usersList.status).toBe(200)
    expect(usersList.body.users[0]).not.toHaveProperty('password_hash')
    expect(usersList.body.users[0]).toMatchObject({ username: 'target_user', role: 'user' })

    // Disable the user
    const disabled = await adminAgent.post(`/api/admin/users/${user.id}/status`).send({ disabled: true })
    expect(disabled.status).toBe(200)
    expect(disabled.body.user.disabledAt).toBeTruthy()

    // Active session is immediately invalidated
    const meAfter = await userAgent.get('/api/auth/me')
    expect(meAfter.body.user).toBeNull()
    const tripsAfter = await userAgent.get('/api/trips')
    expect(tripsAfter.status).toBe(401)

    // Login is blocked with 403
    const loginAttempt = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', nextIp())
      .send({ email: 'target_user@example.com', password: 'hunter2hunter2' })
    expect(loginAttempt.status).toBe(403)
  })

  it('promotes, demotes, and deletes users while blocking self-destructive actions', async () => {
    const { user: other } = await signedInAgent('member_d')
    const { agent: adminAgent, user: admin } = await signedInAgent('admin_d', { admin: true })

    // Self-demotion, self-disable, and self-delete are blocked
    expect((await adminAgent.post(`/api/admin/users/${admin.id}/role`).send({ role: 'user' })).status).toBe(400)
    expect((await adminAgent.post(`/api/admin/users/${admin.id}/status`).send({ disabled: true })).status).toBe(400)
    expect((await adminAgent.delete(`/api/admin/users/${admin.id}`)).status).toBe(400)

    // Promote and demote another user
    const promoted = await adminAgent.post(`/api/admin/users/${other.id}/role`).send({ role: 'admin' })
    expect(promoted.body.user.role).toBe('admin')
    const demoted = await adminAgent.post(`/api/admin/users/${other.id}/role`).send({ role: 'user' })
    expect(demoted.body.user.role).toBe('user')

    // Delete user
    expect((await adminAgent.delete(`/api/admin/users/${other.id}`)).status).toBe(204)
    expect((await adminAgent.get('/api/admin/users?q=member_d')).body.users).toHaveLength(0)
  })
})
