const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const express = require('express')
const rateLimit = require('express-rate-limit')
const db = require('./db.cjs')
const { haversineMeters, locate, namesSimilar } = require('./geo.cjs')
const filterOptions = require('../src/data/filterOptions.json')

const LIMITS = { nameMin: 3, nameMax: 80, descriptionMax: 500, maxTags: 6, perDay: 5, noteMax: 200, photoBytes: 1024 * 1024, duplicateMeters: 300 }
const CATEGORIES = new Set(filterOptions.categories)
const TAGS = new Set([...filterOptions.vibeTags, ...filterOptions.dietaryTags].map(tag => tag.id))
const PHOTO_HOSTS = new Set(['images.unsplash.com'])
const UPLOAD_PATTERN = /^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/

const dbFile = process.env.CE_DB_PATH
const uploadDir = process.env.CE_UPLOAD_DIR || (dbFile === ':memory:'
  ? path.join(os.tmpdir(), 'ce-test-uploads')
  : path.join(dbFile ? path.dirname(dbFile) : path.join(__dirname, '..', 'data'), 'uploads'))

function stripControl(value) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
}

function imageType(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: 'jpg' }
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png' }
  if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp' }
  return null
}

function validatePhotoUrl(value) {
  if (value === undefined || value === null || value === '') return { photoUrl: null }
  if (typeof value !== 'string' || value.length > 300) return { error: 'Photo link is too long.' }
  if (UPLOAD_PATTERN.test(value)) {
    return fs.existsSync(path.join(uploadDir, path.basename(value))) ? { photoUrl: value } : { error: 'That uploaded photo could not be found. Upload it again.' }
  }
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && PHOTO_HOSTS.has(url.hostname)) return { photoUrl: url.toString() }
  } catch { /* fall through */ }
  return { error: `Photo links must be https links from ${[...PHOTO_HOSTS].join(', ')}, or an uploaded image.` }
}

/** Validates client input. Province is always derived server-side from the coordinates. */
function validateSuggestion(input) {
  const body = input && typeof input === 'object' ? input : {}
  const name = typeof body.name === 'string' ? stripControl(body.name).replace(/\s+/g, ' ').trim() : ''
  if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) return { error: `Place name must be ${LIMITS.nameMin}-${LIMITS.nameMax} characters.` }
  if (!CATEGORIES.has(body.category)) return { error: 'Choose a valid category.' }
  const description = typeof body.description === 'string' ? stripControl(body.description).trim() : ''
  if (description.length > LIMITS.descriptionMax) return { error: `Your note can be at most ${LIMITS.descriptionMax} characters.` }
  const rawTags = Array.isArray(body.tags) ? body.tags : []
  if (rawTags.length > LIMITS.maxTags || rawTags.some(tag => typeof tag !== 'string' || !TAGS.has(tag))) return { error: 'Choose up to 6 of the listed vibe tags.' }
  const where = locate(body.lat, body.lng)
  if (where.error) return { error: where.error }
  const photo = validatePhotoUrl(body.photoUrl)
  if (photo.error) return { error: photo.error }
  return { value: { name, category: body.category, description, tags: [...new Set(rawTags)], lat: body.lat, lng: body.lng, province: where.province, photoUrl: photo.photoUrl, confirmDuplicate: body.confirmDuplicate === true } }
}

function serialize(row, { admin = false } = {}) {
  const result = {
    id: row.id,
    name: row.name,
    category: row.category,
    province: row.province,
    lat: row.lat,
    lng: row.lng,
    description: row.description,
    tags: JSON.parse(row.tags),
    photoUrl: row.photo_url,
    status: row.status,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
  if (row.likes !== undefined) result.likes = row.likes
  if (row.liked !== undefined) result.liked = Boolean(row.liked)
  if (admin) result.submittedBy = row.username
  return result
}

function findDuplicates(value, excludeId = 0) {
  const rows = db.prepare("SELECT id, name, lat, lng, status FROM suggestions WHERE deleted_at IS NULL AND status != 'rejected' AND id != ?").all(excludeId)
  return rows
    .map(row => ({ id: row.id, name: row.name, status: row.status, distanceMeters: Math.round(haversineMeters(value.lat, value.lng, row.lat, row.lng)) }))
    .filter(row => row.distanceMeters <= LIMITS.duplicateMeters && namesSimilar(row.name, value.name))
}

const uploadCounts = new Map()
function underUploadQuota(userId) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const recent = (uploadCounts.get(userId) || []).filter(time => time > cutoff)
  if (recent.length >= 15) return false
  uploadCounts.set(userId, [...recent, Date.now()])
  return true
}

function createSuggestionsRouter({ requireAuth, requireAdmin, getAuthenticatedUser }) {
  const router = express.Router()
  const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please try again in a few minutes.' } })
  const parseId = (request, response) => {
    const id = Number(request.params.id)
    if (!Number.isInteger(id) || id < 1) { response.status(404).json({ error: 'Suggestion not found.' }); return null }
    return id
  }
  const withVotes = 'SELECT s.*, u.username, (SELECT COUNT(*) FROM suggestion_likes l WHERE l.suggestion_id = s.id) AS likes, EXISTS(SELECT 1 FROM suggestion_likes l WHERE l.suggestion_id = s.id AND l.user_id = ?) AS liked FROM suggestions s JOIN users u ON u.id = s.user_id'

  // Public: approved suggestions, as read by the map and place list.
  router.get('/community-places', (request, response) => {
    const viewer = getAuthenticatedUser(request)
    const rows = db.prepare(`${withVotes} WHERE s.status = 'approved' AND s.deleted_at IS NULL ORDER BY s.reviewed_at DESC, s.id DESC`).all(viewer ? viewer.id : 0)
    return response.json({ places: rows.map(row => serialize(row)) })
  })

  router.post('/suggestions/photo', requireAuth, writeLimit, express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: LIMITS.photoBytes }), (request, response) => {
    if (!Buffer.isBuffer(request.body) || !request.body.length) return response.status(400).json({ error: 'Choose a JPEG, PNG or WebP image up to 1 MB.' })
    const detected = imageType(request.body)
    if (!detected) return response.status(400).json({ error: 'That file is not a valid JPEG, PNG or WebP image.' })
    if (!underUploadQuota(request.user.id)) return response.status(429).json({ error: 'Daily photo upload limit reached.' })
    fs.mkdirSync(uploadDir, { recursive: true })
    const filename = `${crypto.randomBytes(16).toString('hex')}.${detected.ext}`
    fs.writeFileSync(path.join(uploadDir, filename), request.body)
    return response.status(201).json({ photoUrl: `/uploads/${filename}` })
  })

  router.get('/suggestions/mine', requireAuth, (request, response) => {
    const rows = db.prepare(`${withVotes} WHERE s.user_id = ? AND s.deleted_at IS NULL ORDER BY s.id DESC`).all(request.user.id, request.user.id)
    return response.json({ suggestions: rows.map(row => serialize(row)), dailyLimit: LIMITS.perDay })
  })

  router.post('/suggestions', requireAuth, writeLimit, (request, response) => {
    const parsed = validateSuggestion(request.body)
    if (parsed.error) return response.status(400).json({ error: parsed.error })
    const { value } = parsed
    // Counts soft-deleted rows too, so deleting a submission does not refund the quota.
    const used = db.prepare("SELECT COUNT(*) AS total FROM suggestions WHERE user_id = ? AND created_at > datetime('now', '-1 day')").get(request.user.id).total
    if (used >= LIMITS.perDay) return response.status(429).json({ error: `You can send up to ${LIMITS.perDay} suggestions a day. Please try again tomorrow.` })
    const duplicates = findDuplicates(value)
    if (duplicates.length && !value.confirmDuplicate) return response.status(409).json({ error: 'A similar place was already suggested nearby.', duplicates })
    const result = db.prepare('INSERT INTO suggestions (user_id, name, category, province, lat, lng, description, tags, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(request.user.id, value.name, value.category, value.province, value.lat, value.lng, value.description, JSON.stringify(value.tags), value.photoUrl)
    const row = db.prepare(`${withVotes} WHERE s.id = ?`).get(request.user.id, result.lastInsertRowid)
    return response.status(201).json({ suggestion: serialize(row) })
  })

  router.put('/suggestions/:id', requireAuth, writeLimit, (request, response) => {
    const id = parseId(request, response)
    if (!id) return undefined
    const existing = db.prepare('SELECT * FROM suggestions WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, request.user.id)
    if (!existing) return response.status(404).json({ error: 'Suggestion not found.' })
    if (existing.status !== 'pending') return response.status(409).json({ error: 'Only pending suggestions can be edited.' })
    const parsed = validateSuggestion(request.body)
    if (parsed.error) return response.status(400).json({ error: parsed.error })
    const { value } = parsed
    const duplicates = findDuplicates(value, id)
    if (duplicates.length && !value.confirmDuplicate) return response.status(409).json({ error: 'A similar place was already suggested nearby.', duplicates })
    db.prepare('UPDATE suggestions SET name = ?, category = ?, province = ?, lat = ?, lng = ?, description = ?, tags = ?, photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(value.name, value.category, value.province, value.lat, value.lng, value.description, JSON.stringify(value.tags), value.photoUrl, id)
    return response.json({ suggestion: serialize(db.prepare(`${withVotes} WHERE s.id = ?`).get(request.user.id, id)) })
  })

  router.delete('/suggestions/:id', requireAuth, (request, response) => {
    const id = parseId(request, response)
    if (!id) return undefined
    const result = db.prepare("UPDATE suggestions SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND status = 'pending' AND deleted_at IS NULL").run(id, request.user.id)
    if (!result.changes) return response.status(404).json({ error: 'Pending suggestion not found.' })
    return response.status(204).end()
  })

  const setLike = liked => (request, response) => {
    const id = parseId(request, response)
    if (!id) return undefined
    const target = db.prepare("SELECT id FROM suggestions WHERE id = ? AND status = 'approved' AND deleted_at IS NULL").get(id)
    if (!target) return response.status(404).json({ error: 'Community pick not found.' })
    if (liked) db.prepare('INSERT OR IGNORE INTO suggestion_likes (suggestion_id, user_id) VALUES (?, ?)').run(id, request.user.id)
    else db.prepare('DELETE FROM suggestion_likes WHERE suggestion_id = ? AND user_id = ?').run(id, request.user.id)
    const likes = db.prepare('SELECT COUNT(*) AS total FROM suggestion_likes WHERE suggestion_id = ?').get(id).total
    return response.json({ likes, liked })
  }
  router.post('/suggestions/:id/like', requireAuth, setLike(true))
  router.delete('/suggestions/:id/like', requireAuth, setLike(false))

  return router
}

module.exports = { createSuggestionsRouter, uploadDir, LIMITS, validateSuggestion, serialize, stripControl }
