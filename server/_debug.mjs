process.env.CE_DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'
const { default: app } = await import('./index.cjs')
const request = (await import('supertest')).default

const agent = request.agent(app)
const r1 = await agent.post('/api/auth/register').set('X-Forwarded-For', '10.0.0.1').send({ username: 'x', email: 'x@example.com', password: 'hunter2hunter2' })
console.log('register status', r1.status)
console.log('set-cookie', r1.headers['set-cookie'])

const r2 = await agent.get('/api/auth/me')
console.log('me status', r2.status)
console.log('me body', r2.body)
console.log('cookie header sent', r2.request.getHeader ? r2.request.getHeader('cookie') : r2.req._header)
process.exit(0)
