// Usage: npm run make-admin -- someone@example.com   (add --revoke to remove access)
const db = require('./db.cjs')

const [email, flag] = process.argv.slice(2)
if (!email) {
  console.error('Usage: npm run make-admin -- <email> [--revoke]')
  process.exit(1)
}
const revoke = flag === '--revoke'
const role = revoke ? 'user' : 'admin'
const isAdmin = revoke ? 0 : 1
const result = db.prepare('UPDATE users SET role = ?, is_admin = ? WHERE lower(email) = ?').run(role, isAdmin, email.trim().toLowerCase())
console.log(result.changes ? `${email}: role set to ${role}.` : `No user found with email ${email}.`)
