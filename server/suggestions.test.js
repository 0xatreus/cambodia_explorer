// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import request from 'supertest'

process.env.CE_DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

// Load through Node's require so the app and these tests share one db.cjs instance (and one
// in-memory database). Importing the .cjs files via ESM gave the tests a second, separate database.
const require = createRequire(import.meta.url)
const app = require('./index.cjs')
const db = require('./db.cjs')

let ipCounter = 0
const nextIp = () => `10.1.0.${++ipCounter}`

function resetDb() {
  db.exec('DELETE FROM suggestion_likes; DELETE FROM suggestions; DELETE FROM sessions; DELETE FROM users;')
}

async function signedInAgent(username = 'traveler1', { admin = false } = {}) {
  const agent = request.agent(app)
  const response = await agent.post('/api/auth/register').set('X-Forwarded-For', nextIp()).send({ username, email: `${username}@example.com`, password: 'hunter2hunter2' })
  expect(response.status).toBe(201)
  if (admin) db.prepare('UPDATE users SET is_admin = 1 WHERE username = ?').run(username)
  return agent
}

// Angkor Wat area; the nearest province reference point is Siem Reap.
const valid = { name: 'Banteay Srei sunrise stop', category: 'Sights', lat: 13.5987, lng: 103.9627, description: 'Quiet before the tour buses arrive.', tags: ['hidden', 'culture'] }

describe('place suggestions API', () => {
  beforeEach(resetDb)

  it('rejects unauthenticated submissions with 401', async () => {
    const response = await request(app).post('/api/suggestions').send(valid)
    expect(response.status).toBe(401)
    expect((await request(app).get('/api/suggestions/mine')).status).toBe(401)
  })

  it('accepts a valid submission as pending and derives the province server-side', async () => {
    const agent = await signedInAgent()
    const response = await agent.post('/api/suggestions').send({ ...valid, province: 'Koh Kong' })
    expect(response.status).toBe(201)
    expect(response.body.suggestion).toMatchObject({ name: valid.name, status: 'pending', province: 'Siem Reap', tags: ['hidden', 'culture'] })
    const mine = await agent.get('/api/suggestions/mine')
    expect(mine.body.suggestions).toHaveLength(1)
  })

  it.each([
    ['outside the Cambodia box (Bangkok)', { lat: 13.75, lng: 100.5 }],
    ['inside the box but in the sea', { lat: 10.4, lng: 102.4 }],
    ['non-numeric coordinates', { lat: '13.5', lng: '103.9' }],
    ['missing coordinates', { lat: undefined, lng: undefined }],
    ['a name that is too short', { name: 'ab' }],
    ['an unknown category', { category: 'Casinos' }],
    ['an unknown tag', { tags: ['not-a-tag'] }],
    ['an over-long note', { description: 'x'.repeat(501) }],
    ['a photo link on an unlisted host', { photoUrl: 'https://evil.example.com/a.jpg' }],
  ])('rejects %s with 400', async (_label, override) => {
    const agent = await signedInAgent()
    const response = await agent.post('/api/suggestions').send({ ...valid, ...override })
    expect(response.status).toBe(400)
    expect(typeof response.body.error).toBe('string')
  })

  it('limits each user to 5 suggestions a day, even after deleting', async () => {
    const agent = await signedInAgent()
    for (let i = 0; i < 5; i += 1) {
      const response = await agent.post('/api/suggestions').send({ ...valid, name: `Hidden spot number ${i}`, lat: 13.55 + i * 0.01 })
      expect(response.status).toBe(201)
      if (i === 0) await agent.delete(`/api/suggestions/${response.body.suggestion.id}`)
    }
    const sixth = await agent.post('/api/suggestions').send({ ...valid, name: 'One more place', lat: 13.2 })
    expect(sixth.status).toBe(429)
  })

  it('warns about a similar nearby place unless the user confirms', async () => {
    const agent = await signedInAgent()
    await agent.post('/api/suggestions').send(valid)
    const second = await agent.post('/api/suggestions').send({ ...valid, lat: valid.lat + 0.0005 })
    expect(second.status).toBe(409)
    expect(second.body.duplicates[0]).toMatchObject({ name: valid.name })
    const confirmed = await agent.post('/api/suggestions').send({ ...valid, lat: valid.lat + 0.0005, confirmDuplicate: true })
    expect(confirmed.status).toBe(201)
  })

  it('lets owners edit and delete pending suggestions only', async () => {
    const owner = await signedInAgent('owner01')
    const other = await signedInAgent('other01')
    const { body } = await owner.post('/api/suggestions').send(valid)
    const id = body.suggestion.id
    expect((await other.put(`/api/suggestions/${id}`).send(valid)).status).toBe(404)
    expect((await other.delete(`/api/suggestions/${id}`)).status).toBe(404)
    const edited = await owner.put(`/api/suggestions/${id}`).send({ ...valid, name: 'Banteay Srei at dawn' })
    expect(edited.body.suggestion.name).toBe('Banteay Srei at dawn')
    expect((await owner.delete(`/api/suggestions/${id}`)).status).toBe(204)
    expect((await owner.get('/api/suggestions/mine')).body.suggestions).toHaveLength(0)
  })

  it('requires admin for review, and approved picks appear in the public list with likes', async () => {
    const user = await signedInAgent('regular1')
    const admin = await signedInAgent('admin001', { admin: true })
    const { body } = await user.post('/api/suggestions').send(valid)
    const id = body.suggestion.id

    expect((await request(app).get('/api/admin/suggestions')).status).toBe(401)
    expect((await user.get('/api/admin/suggestions')).status).toBe(403)
    expect((await user.post(`/api/admin/suggestions/${id}/review`).send({ decision: 'approved' })).status).toBe(403)
    expect((await request(app).get('/api/community-places')).body.places).toHaveLength(0)

    expect((await admin.post(`/api/admin/suggestions/${id}/review`).send({ decision: 'rejected' })).status).toBe(400)
    const approved = await admin.post(`/api/admin/suggestions/${id}/review`).send({ decision: 'approved' })
    expect(approved.body.suggestion.status).toBe('approved')

    const publicList = await request(app).get('/api/community-places')
    expect(publicList.body.places).toMatchObject([{ id, name: valid.name, province: 'Siem Reap', likes: 0 }])
    expect((await user.get('/api/suggestions/mine')).body.suggestions[0].status).toBe('approved')

    expect((await admin.post(`/api/suggestions/${id}/like`)).body).toEqual({ likes: 1, liked: true })
    expect((await admin.post(`/api/suggestions/${id}/like`)).body).toEqual({ likes: 1, liked: true })
    expect((await admin.delete(`/api/suggestions/${id}/like`)).body).toEqual({ likes: 0, liked: false })
  })

  it('shows a rejection note to the submitter', async () => {
    const user = await signedInAgent('regular2')
    const admin = await signedInAgent('admin002', { admin: true })
    const { body } = await user.post('/api/suggestions').send(valid)
    await admin.post(`/api/admin/suggestions/${body.suggestion.id}/review`).send({ decision: 'rejected', note: 'Already covered by Banteay Srei.' })
    const [mine] = (await user.get('/api/suggestions/mine')).body.suggestions
    expect(mine).toMatchObject({ status: 'rejected', reviewNote: 'Already covered by Banteay Srei.' })
  })

  it('accepts small images and rejects other files on photo upload', async () => {
    const agent = await signedInAgent()
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)])
    const ok = await agent.post('/api/suggestions/photo').set('Content-Type', 'image/png').send(png)
    expect(ok.status).toBe(201)
    expect(ok.body.photoUrl).toMatch(/^\/uploads\/[a-f0-9]{32}\.png$/)
    const fake = await agent.post('/api/suggestions/photo').set('Content-Type', 'image/png').send(Buffer.from('definitely not an image'))
    expect(fake.status).toBe(400)
    const wrongType = await agent.post('/api/suggestions/photo').set('Content-Type', 'text/plain').send('hello')
    expect(wrongType.status).toBe(400)
    const submit = await agent.post('/api/suggestions').send({ ...valid, photoUrl: ok.body.photoUrl })
    expect(submit.status).toBe(201)
  })

  it('answers malformed JSON with 400 instead of 500', async () => {
    const agent = await signedInAgent()
    const response = await agent.post('/api/suggestions').set('Content-Type', 'application/json').send('{"name":')
    expect(response.status).toBe(400)
  })
})
