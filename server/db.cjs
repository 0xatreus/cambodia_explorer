const fs = require('node:fs')
const path = require('node:path')
const Database = require('better-sqlite3')

const dataDirectory = path.join(__dirname, '..', 'data')
const dbPath = process.env.CE_DB_PATH || path.join(dataDirectory, 'cambodia-explorer.sqlite')
if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const db = new Database(dbPath)
if (dbPath !== ':memory:') db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    days INTEGER NOT NULL DEFAULT 5,
    tier TEXT NOT NULL DEFAULT 'value',
    place_ids TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
  CREATE INDEX IF NOT EXISTS trips_user_id_idx ON trips(user_id);
`)

// --- Migrations & additional tables ------------------------------------------
// CREATE TABLE IF NOT EXISTS covers fresh and existing database files alike; the
// helper below adds columns that were introduced after a table first shipped.
function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!columns.some(existing => existing.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

addColumnIfMissing('users', 'is_admin', 'INTEGER NOT NULL DEFAULT 0')
addColumnIfMissing('users', 'role', "TEXT NOT NULL DEFAULT 'user'")
addColumnIfMissing('users', 'disabled_at', 'TEXT')

// Keep legacy is_admin and the canonical role column in sync on existing DB files.
db.exec("UPDATE users SET role = 'admin' WHERE is_admin = 1 AND role != 'admin'")
db.exec("UPDATE users SET is_admin = 1 WHERE role = 'admin' AND is_admin = 0")

db.exec(`
  CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    province TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    review_note TEXT,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS suggestion_likes (
    suggestion_id INTEGER NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (suggestion_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS admin_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    admin_username TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    suggestion_id INTEGER REFERENCES suggestions(id) ON DELETE SET NULL,
    email_sent INTEGER NOT NULL DEFAULT 0,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS suggestions_user_idx ON suggestions(user_id, created_at);
  CREATE INDEX IF NOT EXISTS suggestions_status_idx ON suggestions(status);
  CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON admin_audit_log(created_at DESC, id DESC);
  CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at DESC);
`)

function parseAdminEmails() {
  return (process.env.CE_ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}

function syncEnvAdmins() {
  const emails = parseAdminEmails()
  if (!emails.length) return
  const promote = db.prepare("UPDATE users SET role = 'admin', is_admin = 1 WHERE lower(email) = ?")
  for (const email of emails) promote.run(email)
}

syncEnvAdmins()

db.syncEnvAdmins = syncEnvAdmins
db.isEnvAdminEmail = email => parseAdminEmails().includes(String(email || '').trim().toLowerCase())

module.exports = db
