import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dataDirectory = fileURLToPath(new URL('./data/', import.meta.url))
mkdirSync(dataDirectory, { recursive: true })

const database = new DatabaseSync(fileURLToPath(new URL('./data/retail.sqlite', import.meta.url)))
database.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS inventory (
    sku TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    stock INTEGER NOT NULL,
    reorder INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    demand TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS journeys (
    id TEXT PRIMARY KEY,
    route TEXT NOT NULL,
    route_label TEXT NOT NULL,
    basket TEXT NOT NULL,
    units INTEGER NOT NULL,
    sales REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

const sessions = new Map()
const passwordHash = (password, salt) => scryptSync(password, salt, 64, { N: 32_768, r: 8, p: 1, maxmem: 67_108_864 })

function readBootstrapVerifier() {
  try {
    return JSON.parse(readFileSync(fileURLToPath(new URL('./data/admin-bootstrap.json', import.meta.url)), 'utf8'))
  } catch {
    const name = process.env.INITIAL_ADMIN_NAME
    const password = process.env.INITIAL_ADMIN_PASSWORD
    if (!name || !password) return null
    const salt = randomBytes(16)
    return { name, salt: salt.toString('hex'), passwordHash: passwordHash(password, salt).toString('hex') }
  }
}

const bootstrapVerifier = readBootstrapVerifier()

function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers })
  response.end(JSON.stringify(payload))
}

function readCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').map((part) => {
    const [key, ...value] = part.trim().split('=')
    return [key, decodeURIComponent(value.join('='))]
  }).filter(([key]) => key))
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) {
        reject(new Error('Request body is too large.'))
        request.destroy()
      }
    })
    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'))
      } catch {
        reject(new Error('Request body must be valid JSON.'))
      }
    })
    request.on('error', reject)
  })
}

function sessionCookie(request, token, maxAge) {
  const secure = request.socket.encrypted || request.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''
  return `kinetix_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`
}

function currentAdmin(request) {
  const token = readCookies(request).kinetix_session
  return token ? sessions.get(token) : undefined
}

function createSession(request, response, adminName) {
  const token = randomBytes(32).toString('base64url')
  sessions.set(token, adminName)
  response.setHeader('Set-Cookie', sessionCookie(request, token, 60 * 60 * 24 * 14))
}

function readInventory() {
  return database.prepare('SELECT sku, name, category, stock, reorder, unit_price AS unitPrice, demand FROM inventory ORDER BY rowid').all()
}

function readJourneys() {
  return database.prepare('SELECT id, route, route_label AS routeLabel, basket, units, sales FROM journeys ORDER BY rowid').all().map((journey) => ({
    ...journey,
    basket: JSON.parse(journey.basket),
  }))
}

function validateData(payload) {
  if (!Array.isArray(payload.inventory) || !Array.isArray(payload.journeys)) return false
  if (payload.inventory.length > 10_000 || payload.journeys.length > 100_000) return false
  return payload.inventory.every((item) => typeof item.sku === 'string'
    && typeof item.name === 'string'
    && typeof item.category === 'string'
    && Number.isInteger(item.stock) && item.stock >= 0
    && Number.isInteger(item.reorder) && item.reorder > 0
    && Number.isFinite(item.unitPrice) && item.unitPrice >= 0)
    && payload.journeys.every((journey) => typeof journey.id === 'string'
      && typeof journey.route === 'string'
      && typeof journey.routeLabel === 'string'
      && Array.isArray(journey.basket)
      && Number.isInteger(journey.units) && journey.units >= 0
      && Number.isFinite(journey.sales) && journey.sales >= 0)
}

function saveData(payload) {
  database.exec('BEGIN IMMEDIATE')
  try {
    database.exec('DELETE FROM inventory; DELETE FROM journeys;')
    const saveInventory = database.prepare('INSERT INTO inventory (sku, name, category, stock, reorder, unit_price, demand) VALUES (?, ?, ?, ?, ?, ?, ?)')
    for (const item of payload.inventory) {
      saveInventory.run(item.sku, item.name, item.category, item.stock, item.reorder, item.unitPrice, item.demand || '')
    }
    const saveJourney = database.prepare('INSERT INTO journeys (id, route, route_label, basket, units, sales) VALUES (?, ?, ?, ?, ?, ?)')
    for (const journey of payload.journeys) {
      saveJourney.run(journey.id, journey.route, journey.routeLabel, JSON.stringify(journey.basket), journey.units, journey.sales)
    }
    database.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('data_initialized', '1')
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

export async function handleApi(request, response) {
  const pathname = new URL(request.url || '/', 'http://localhost').pathname
  if (!pathname.startsWith('/api/')) return false

  try {
    if (request.method === 'GET' && pathname === '/api/auth/status') {
      const adminExists = Boolean(database.prepare('SELECT id FROM admin WHERE id = 1').get())
      sendJson(response, 200, { registrationOpen: !adminExists && Boolean(bootstrapVerifier), setupConfigured: Boolean(bootstrapVerifier) })
      return true
    }

    if (request.method === 'POST' && pathname === '/api/auth/register') {
      const payload = await readBody(request)
      const name = typeof payload.name === 'string' ? payload.name.trim() : ''
      const password = typeof payload.password === 'string' ? payload.password : ''
      if (database.prepare('SELECT id FROM admin WHERE id = 1').get()) {
        sendJson(response, 409, { error: 'The one-time admin registration is already complete. Log in instead.' })
        return true
      }
      if (!bootstrapVerifier || name.toLocaleLowerCase() !== bootstrapVerifier.name.toLocaleLowerCase() || password.length < 8) {
        sendJson(response, 400, { error: 'Use the configured admin name and password for first-time registration.' })
        return true
      }
      const suppliedHash = passwordHash(password, Buffer.from(bootstrapVerifier.salt, 'hex'))
      const expectedBootstrapHash = Buffer.from(bootstrapVerifier.passwordHash, 'hex')
      if (suppliedHash.length !== expectedBootstrapHash.length || !timingSafeEqual(suppliedHash, expectedBootstrapHash)) {
        sendJson(response, 401, { error: 'The initial admin name or password is incorrect.' })
        return true
      }
      const salt = randomBytes(16)
      database.prepare('INSERT INTO admin (id, name, salt, password_hash) VALUES (1, ?, ?, ?)').run(name, salt.toString('hex'), passwordHash(password, salt).toString('hex'))
      createSession(request, response, name)
      sendJson(response, 201, { admin: { name } })
      return true
    }

    if (request.method === 'POST' && pathname === '/api/auth/login') {
      const payload = await readBody(request)
      const name = typeof payload.name === 'string' ? payload.name.trim() : ''
      const password = typeof payload.password === 'string' ? payload.password : ''
      const admin = database.prepare('SELECT name, salt, password_hash AS passwordHash FROM admin WHERE id = 1').get()
      if (!admin || admin.name.toLocaleLowerCase() !== name.toLocaleLowerCase()) {
        sendJson(response, 401, { error: 'Admin name or password is incorrect.' })
        return true
      }
      const actualHash = passwordHash(password, Buffer.from(admin.salt, 'hex'))
      const expectedHash = Buffer.from(admin.passwordHash, 'hex')
      if (actualHash.length !== expectedHash.length || !timingSafeEqual(actualHash, expectedHash)) {
        sendJson(response, 401, { error: 'Admin name or password is incorrect.' })
        return true
      }
      createSession(request, response, admin.name)
      sendJson(response, 200, { admin: { name: admin.name } })
      return true
    }

    if (request.method === 'GET' && pathname === '/api/auth/session') {
      const adminName = currentAdmin(request)
      if (!adminName) {
        sendJson(response, 401, { error: 'Login required.' })
        return true
      }
      sendJson(response, 200, { admin: { name: adminName } })
      return true
    }

    if (request.method === 'POST' && pathname === '/api/auth/logout') {
      const token = readCookies(request).kinetix_session
      if (token) sessions.delete(token)
      sendJson(response, 200, { ok: true }, { 'Set-Cookie': sessionCookie(request, '', 0) })
      return true
    }

    if (pathname === '/api/data' && request.method === 'GET') {
      if (!currentAdmin(request)) {
        sendJson(response, 401, { error: 'Login required.' })
        return true
      }
      const initialized = database.prepare('SELECT value FROM settings WHERE key = ?').get('data_initialized')?.value === '1'
      sendJson(response, 200, { initialized, inventory: readInventory(), journeys: readJourneys() })
      return true
    }

    if (pathname === '/api/data' && request.method === 'PUT') {
      if (!currentAdmin(request)) {
        sendJson(response, 401, { error: 'Login required.' })
        return true
      }
      const payload = await readBody(request)
      if (!validateData(payload)) {
        sendJson(response, 400, { error: 'Inventory or journey data is invalid.' })
        return true
      }
      saveData(payload)
      sendJson(response, 200, { ok: true })
      return true
    }

    sendJson(response, 404, { error: 'API route not found.' })
    return true
  } catch (error) {
    sendJson(response, 500, { error: 'The local data service could not complete the request.' })
    console.error(error)
    return true
  }
}