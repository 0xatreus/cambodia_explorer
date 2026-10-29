const express = require('express')
const rateLimit = require('express-rate-limit')
const db = require('./db.cjs')
const { haversineMeters, namesSimilar } = require('./geo.cjs')
const { LIMITS, serialize, stripControl, validateSuggestion } = require('./suggestions.cjs')
const { notifySuggestionReview } = require('./notifications.cjs')
const provinces = require('../src/data/provinces.json')
const catalogSummary = require('../src/data/catalogSummary.json')

const PAGE_SIZE = 25
const VALID_PROVINCES = new Set(provinces.map(p => p.name))
const CATALOG_BY_ID = new Map(catalogSummary.map(place => [place.id, place]))

function recordAudit(adminUser, action, targetType, targetId, details = {}) {
  db.prepare(`
    INSERT INTO admin_audit_log (admin_id, admin_username, action, target_type, target_id, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(adminUser.id, adminUser.username, action, targetType, String(targetId), JSON.stringify(details))
}

function parsePagination(queryPage, total) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const requested = Number.parseInt(queryPage, 10)
  const page = Number.isInteger(requested) && requested >= 1 ? Math.min(requested, totalPages) : 1
  const offset = (page - 1) * PAGE_SIZE
  return { page, pageSize: PAGE_SIZE, offset, total, totalPages }
}

function findAdminDuplicates(row) {
  const matches = []
  for (const place of catalogSummary) {
    const distanceMeters = Math.round(haversineMeters(row.lat, row.lng, place.lat, place.lng))
    if (distanceMeters <= LIMITS.duplicateMeters && namesSimilar(place.name, row.name)) {
      matches.push({ id: place.id, name: place.name, source: 'catalog', distanceMeters })
    }
  }
  const otherRows = db.prepare("SELECT id, name, lat, lng, status FROM suggestions WHERE deleted_at IS NULL AND status != 'rejected' AND id != ?").all(row.id)
  for (const other of otherRows) {
    const distanceMeters = Math.round(haversineMeters(row.lat, row.lng, other.lat, other.lng))
    if (distanceMeters <= LIMITS.duplicateMeters && namesSimilar(other.name, row.name)) {
      matches.push({ id: `suggestion-${other.id}`, name: other.name, source: other.status, distanceMeters })
    }
  }
  return matches
}

function serializeUserRow(row) {
  const isAdmin = row.role === 'admin' || Boolean(row.is_admin)
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: isAdmin ? 'admin' : 'user',
    isAdmin,
    disabledAt: row.disabled_at || null,
    createdAt: row.created_at,
    tripCount: Number(row.trip_count || 0),
    suggestionCount: Number(row.suggestion_count || 0),
  }
}

function resolvePlaceLabel(id) {
  const catalog = CATALOG_BY_ID.get(id)
  if (catalog) return { id, name: catalog.name, province: catalog.province }
  if (typeof id === 'string' && id.startsWith('community-')) {
    const numId = Number(id.slice('community-'.length))
    if (Number.isInteger(numId)) {
      const row = db.prepare('SELECT name, province FROM suggestions WHERE id = ?').get(numId)
      if (row) return { id, name: row.name, province: row.province }
    }
  }
  return { id, name: id, province: '' }
}

function createAdminRouter({ requireAdmin }) {
  const router = express.Router()
  const adminRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many admin requests. Please wait a moment and try again.' },
  })

  router.use(adminRateLimit)
  router.use(requireAdmin)

  const parseId = (request, response, label = 'Item') => {
    const id = Number(request.params.id)
    if (!Number.isInteger(id) || id < 1) {
      response.status(404).json({ error: `${label} not found.` })
      return null
    }
    return id
  }

  const withVotes = 'SELECT s.*, u.username, u.email AS submitter_email, (SELECT COUNT(*) FROM suggestion_likes l WHERE l.suggestion_id = s.id) AS likes, EXISTS(SELECT 1 FROM suggestion_likes l WHERE l.suggestion_id = s.id AND l.user_id = ?) AS liked FROM suggestions s JOIN users u ON u.id = s.user_id'

  // 1. Overview
  router.get('/overview', (request, response) => {
    const totalUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count
    const disabledUsers = db.prepare('SELECT COUNT(*) AS count FROM users WHERE disabled_at IS NOT NULL').get().count
    const admins = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' OR is_admin = 1").get().count
    const trips = db.prepare('SELECT COUNT(*) AS count FROM trips').get().count
    const signupsLast30Days = db.prepare("SELECT COUNT(*) AS count FROM users WHERE created_at >= datetime('now', '-30 days')").get().count

    const statusRows = db.prepare('SELECT status, COUNT(*) AS count FROM suggestions WHERE deleted_at IS NULL GROUP BY status').all()
    const suggestionCounts = { pending: 0, approved: 0, rejected: 0 }
    for (const row of statusRows) {
      if (suggestionCounts[row.status] !== undefined) suggestionCounts[row.status] = row.count
    }

    const signupsByDay = db.prepare(`
      SELECT date(created_at) AS day, COUNT(*) AS count
      FROM users
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY day ASC
    `).all()

    const placeCounts = new Map()
    const tripRows = db.prepare('SELECT place_ids FROM trips').all()
    for (const row of tripRows) {
      try {
        const ids = JSON.parse(row.place_ids)
        if (Array.isArray(ids)) {
          for (const id of ids) {
            if (typeof id === 'string') placeCounts.set(id, (placeCounts.get(id) || 0) + 1)
          }
        }
      } catch { /* ignore malformed row */ }
    }
    const mostSavedPlaces = [...placeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, count]) => ({ ...resolvePlaceLabel(id), count }))

    const mostSuggestedProvinces = db.prepare(`
      SELECT province, COUNT(*) AS count
      FROM suggestions
      WHERE deleted_at IS NULL
      GROUP BY province
      ORDER BY count DESC, province ASC
      LIMIT 8
    `).all()

    return response.json({
      counts: {
        users: totalUsers,
        activeUsers: totalUsers - disabledUsers,
        disabledUsers,
        admins,
        trips,
        suggestions: suggestionCounts,
        signupsLast30Days,
      },
      signupsByDay,
      mostSavedPlaces,
      mostSuggestedProvinces,
    })
  })

  // 2. Suggestions queue
  router.get('/suggestions', (request, response) => {
    const status = ['pending', 'approved', 'rejected', 'all'].includes(request.query.status) ? request.query.status : 'pending'
    const q = typeof request.query.q === 'string' ? request.query.q.trim() : ''
    const clauses = ['s.deleted_at IS NULL']
    const params = []
    if (status !== 'all') {
      clauses.push('s.status = ?')
      params.push(status)
    }
    if (q) {
      clauses.push('(s.name LIKE ? OR s.province LIKE ? OR s.category LIKE ? OR u.username LIKE ?)')
      const pattern = `%${q}%`
      params.push(pattern, pattern, pattern, pattern)
    }
    const whereSql = clauses.join(' AND ')
    const total = db.prepare(`SELECT COUNT(*) AS count FROM suggestions s JOIN users u ON u.id = s.user_id WHERE ${whereSql}`).get(...params).count
    const pageMeta = parsePagination(request.query.page, total)
    const rows = db.prepare(`${withVotes} WHERE ${whereSql} ORDER BY s.id ASC LIMIT ? OFFSET ?`).all(request.user.id, ...params, pageMeta.pageSize, pageMeta.offset)
    const suggestions = rows.map(row => ({
      ...serialize(row, { admin: true }),
      submitterEmail: row.submitter_email,
      duplicates: findAdminDuplicates(row),
    }))
    return response.json({ suggestions, ...pageMeta })
  })

  router.put('/suggestions/:id', (request, response) => {
    const id = parseId(request, response, 'Suggestion')
    if (!id) return undefined
    const existing = db.prepare('SELECT * FROM suggestions WHERE id = ? AND deleted_at IS NULL').get(id)
    if (!existing) return response.status(404).json({ error: 'Suggestion not found.' })
    const parsed = validateSuggestion(request.body)
    if (parsed.error) return response.status(400).json({ error: parsed.error })
    const { value } = parsed
    const requestedProvince = typeof request.body?.province === 'string' ? request.body.province.trim() : ''
    const province = VALID_PROVINCES.has(requestedProvince) ? requestedProvince : value.province
    db.prepare(`
      UPDATE suggestions
      SET name = ?, category = ?, province = ?, lat = ?, lng = ?, description = ?, tags = ?, photo_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(value.name, value.category, province, value.lat, value.lng, value.description, JSON.stringify(value.tags), value.photoUrl, id)
    recordAudit(request.user, 'suggestion.edit', 'suggestion', id, { name: value.name, province, category: value.category })
    const updatedRow = db.prepare(`${withVotes} WHERE s.id = ?`).get(request.user.id, id)
    return response.json({
      suggestion: {
        ...serialize(updatedRow, { admin: true }),
        submitterEmail: updatedRow.submitter_email,
        duplicates: findAdminDuplicates(updatedRow),
      },
    })
  })

  router.post('/suggestions/:id/review', (request, response) => {
    const id = parseId(request, response, 'Suggestion')
    if (!id) return undefined
    const body = request.body || {}
    const decision = body.decision
    const note = typeof body.note === 'string' ? stripControl(body.note).trim() : ''
    if (decision !== 'approved' && decision !== 'rejected') return response.status(400).json({ error: 'Decision must be approved or rejected.' })
    if (note.length > LIMITS.noteMax) return response.status(400).json({ error: `Notes can be at most ${LIMITS.noteMax} characters.` })
    if (decision === 'rejected' && !note) return response.status(400).json({ error: 'Add a short note explaining the rejection.' })
    const existing = db.prepare('SELECT * FROM suggestions WHERE id = ? AND deleted_at IS NULL').get(id)
    if (!existing) return response.status(404).json({ error: 'Suggestion not found.' })
    if (existing.status !== 'pending') return response.status(409).json({ error: 'Only pending suggestions can be reviewed.' })
    db.prepare(`
      UPDATE suggestions
      SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(decision, note || null, request.user.id, id)
    recordAudit(request.user, decision === 'approved' ? 'suggestion.approve' : 'suggestion.reject', 'suggestion', id, {
      name: existing.name,
      province: existing.province,
      note: note || null,
    })
    const updatedRow = db.prepare(`${withVotes} WHERE s.id = ?`).get(request.user.id, id)
    notifySuggestionReview({
      userId: updatedRow.user_id,
      userEmail: updatedRow.submitter_email,
      username: updatedRow.username,
      suggestionId: id,
      placeName: updatedRow.name,
      province: updatedRow.province,
      decision,
      note: note || null,
    })
    return response.json({
      suggestion: {
        ...serialize(updatedRow, { admin: true }),
        submitterEmail: updatedRow.submitter_email,
        duplicates: findAdminDuplicates(updatedRow),
      },
    })
  })

  router.delete('/suggestions/:id', (request, response) => {
    const id = parseId(request, response, 'Suggestion')
    if (!id) return undefined
    const existing = db.prepare('SELECT id, name, province FROM suggestions WHERE id = ? AND deleted_at IS NULL').get(id)
    if (!existing) return response.status(404).json({ error: 'Suggestion not found.' })
    db.prepare('UPDATE suggestions SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
    recordAudit(request.user, 'suggestion.delete', 'suggestion', id, { name: existing.name, province: existing.province })
    return response.status(204).end()
  })

  // 3. Users management
  const userSelectSql = `
    SELECT
      u.id, u.username, u.email, u.role, u.is_admin, u.disabled_at, u.created_at,
      (SELECT COUNT(*) FROM trips t WHERE t.user_id = u.id) AS trip_count,
      (SELECT COUNT(*) FROM suggestions s WHERE s.user_id = u.id AND s.deleted_at IS NULL) AS suggestion_count
    FROM users u
  `

  router.get('/users', (request, response) => {
    const q = typeof request.query.q === 'string' ? request.query.q.trim() : ''
    const whereSql = q ? 'WHERE u.username LIKE ? OR u.email LIKE ?' : ''
    const params = q ? [`%${q}%`, `%${q}%`] : []
    const total = db.prepare(`SELECT COUNT(*) AS count FROM users u ${whereSql}`).get(...params).count
    const pageMeta = parsePagination(request.query.page, total)
    const rows = db.prepare(`${userSelectSql} ${whereSql} ORDER BY u.id DESC LIMIT ? OFFSET ?`).all(...params, pageMeta.pageSize, pageMeta.offset)
    return response.json({ users: rows.map(serializeUserRow), ...pageMeta })
  })

  router.post('/users/:id/role', (request, response) => {
    const id = parseId(request, response, 'User')
    if (!id) return undefined
    const role = request.body?.role
    if (role !== 'admin' && role !== 'user') return response.status(400).json({ error: 'Role must be admin or user.' })
    if (id === request.user.id && role !== 'admin') return response.status(400).json({ error: 'You cannot remove your own admin role.' })
    const target = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(id)
    if (!target) return response.status(404).json({ error: 'User not found.' })
    db.prepare('UPDATE users SET role = ?, is_admin = ? WHERE id = ?').run(role, role === 'admin' ? 1 : 0, id)
    recordAudit(request.user, role === 'admin' ? 'user.promote' : 'user.demote', 'user', id, { username: target.username, email: target.email, role })
    const updated = db.prepare(`${userSelectSql} WHERE u.id = ?`).get(id)
    return response.json({ user: serializeUserRow(updated) })
  })

  router.post('/users/:id/status', (request, response) => {
    const id = parseId(request, response, 'User')
    if (!id) return undefined
    const disabled = Boolean(request.body?.disabled)
    if (id === request.user.id && disabled) return response.status(400).json({ error: 'You cannot disable your own account.' })
    const target = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(id)
    if (!target) return response.status(404).json({ error: 'User not found.' })
    if (disabled) {
      db.prepare('UPDATE users SET disabled_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id)
    } else {
      db.prepare('UPDATE users SET disabled_at = NULL WHERE id = ?').run(id)
    }
    recordAudit(request.user, disabled ? 'user.disable' : 'user.enable', 'user', id, { username: target.username, email: target.email })
    const updated = db.prepare(`${userSelectSql} WHERE u.id = ?`).get(id)
    return response.json({ user: serializeUserRow(updated) })
  })

  router.delete('/users/:id', (request, response) => {
    const id = parseId(request, response, 'User')
    if (!id) return undefined
    if (id === request.user.id) return response.status(400).json({ error: 'You cannot delete your own account.' })
    const target = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(id)
    if (!target) return response.status(404).json({ error: 'User not found.' })
    db.prepare('DELETE FROM users WHERE id = ?').run(id)
    recordAudit(request.user, 'user.delete', 'user', id, { username: target.username, email: target.email })
    return response.status(204).end()
  })

  // 4. Trips (read-only)
  router.get('/trips', (request, response) => {
    const q = typeof request.query.q === 'string' ? request.query.q.trim() : ''
    const whereSql = q ? 'WHERE t.name LIKE ? OR u.username LIKE ? OR u.email LIKE ?' : ''
    const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : []
    const total = db.prepare(`SELECT COUNT(*) AS count FROM trips t JOIN users u ON u.id = t.user_id ${whereSql}`).get(...params).count
    const pageMeta = parsePagination(request.query.page, total)
    const rows = db.prepare(`
      SELECT t.id, t.name, t.days, t.tier, t.place_ids, t.created_at, t.updated_at, u.id AS user_id, u.username, u.email
      FROM trips t
      JOIN users u ON u.id = t.user_id
      ${whereSql}
      ORDER BY t.updated_at DESC, t.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageMeta.pageSize, pageMeta.offset)
    const trips = rows.map(row => {
      let placeIds = []
      try { placeIds = JSON.parse(row.place_ids) } catch { placeIds = [] }
      return {
        id: row.id,
        name: row.name,
        days: row.days,
        tier: row.tier,
        placeIds,
        stops: Array.isArray(placeIds) ? placeIds.map(resolvePlaceLabel) : [],
        owner: { id: row.user_id, username: row.username, email: row.email },
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    })
    return response.json({ trips, ...pageMeta })
  })

  // 5. Audit log
  router.get('/audit-log', (request, response) => {
    const total = db.prepare('SELECT COUNT(*) AS count FROM admin_audit_log').get().count
    const pageMeta = parsePagination(request.query.page, total)
    const rows = db.prepare(`
      SELECT id, admin_id, admin_username, action, target_type, target_id, details, created_at
      FROM admin_audit_log
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).all(pageMeta.pageSize, pageMeta.offset)
    const logs = rows.map(row => {
      let details = {}
      try { details = JSON.parse(row.details) } catch { details = {} }
      return {
        id: row.id,
        adminId: row.admin_id,
        adminUsername: row.admin_username,
        action: row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        details,
        createdAt: row.created_at,
      }
    })
    return response.json({ logs, ...pageMeta })
  })

  return router
}

module.exports = { createAdminRouter }
