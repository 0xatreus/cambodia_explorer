const fs = require('node:fs')
const path = require('node:path')
const express = require('express')
const db = require('./db.cjs')

const outboxPath = path.join(__dirname, '..', 'data', 'outbox.jsonl')

function sendEmailNotification({ to, username, subject, text, suggestionId, decision }) {
  if (!to) return false
  const entry = {
    to,
    username,
    subject,
    text,
    suggestionId,
    decision,
    sentAt: new Date().toISOString(),
  }
  try {
    if (process.env.CE_DB_PATH !== ':memory:') {
      fs.mkdirSync(path.dirname(outboxPath), { recursive: true })
      fs.appendFileSync(outboxPath, `${JSON.stringify(entry)}\n`, 'utf8')
    }
    if (process.env.CE_EMAIL_WEBHOOK_URL) {
      fetch(process.env.CE_EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(() => {})
    } else if (process.env.NODE_ENV !== 'test') {
      console.log(`[Email notification -> ${to}] ${subject}`)
    }
    return true
  } catch {
    return false
  }
}

function notifySuggestionReview({ userId, userEmail, username, suggestionId, placeName, province, decision, note }) {
  const approved = decision === 'approved'
  const type = approved ? 'suggestion_approved' : 'suggestion_rejected'
  const title = approved
    ? `Your suggestion "${placeName}" was approved!`
    : `Update on your suggestion "${placeName}"`
  const body = approved
    ? `"${placeName}" (${province}) has been approved and is now live on the Cambodia Explorer map with a Community pick badge.${note ? ` Reviewer note: ${note}` : ''}`
    : `Your suggestion "${placeName}" (${province}) was not approved. Reviewer note: ${note}`

  const emailSent = sendEmailNotification({
    to: userEmail,
    username,
    subject: title,
    text: body,
    suggestionId,
    decision,
  })

  const result = db.prepare(`
    INSERT INTO notifications (user_id, type, title, body, suggestion_id, email_sent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, type, title, body, suggestionId, emailSent ? 1 : 0)

  return result.lastInsertRowid
}

function serializeNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    suggestionId: row.suggestion_id,
    emailSent: Boolean(row.email_sent),
    readAt: row.read_at || null,
    createdAt: row.created_at,
  }
}

function createNotificationsRouter({ requireAuth }) {
  const router = express.Router()

  router.get('/notifications', requireAuth, (request, response) => {
    const rows = db.prepare(`
      SELECT id, type, title, body, suggestion_id, email_sent, read_at, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 50
    `).all(request.user.id)
    const unreadCount = db.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL').get(request.user.id).count
    return response.json({
      notifications: rows.map(serializeNotification),
      unreadCount,
    })
  })

  router.post('/notifications/read-all', requireAuth, (request, response) => {
    db.prepare('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL').run(request.user.id)
    return response.json({ unreadCount: 0 })
  })

  router.post('/notifications/:id/read', requireAuth, (request, response) => {
    const id = Number(request.params.id)
    if (!Number.isInteger(id) || id < 1) return response.status(404).json({ error: 'Notification not found.' })
    const result = db.prepare('UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = ? AND user_id = ?').run(id, request.user.id)
    if (!result.changes) return response.status(404).json({ error: 'Notification not found.' })
    const unreadCount = db.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL').get(request.user.id).count
    return response.json({ unreadCount })
  })

  return router
}

module.exports = { createNotificationsRouter, notifySuggestionReview }
