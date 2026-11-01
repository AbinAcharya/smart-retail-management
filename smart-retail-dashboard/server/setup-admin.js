import { randomBytes, scryptSync } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const dataDirectory = fileURLToPath(new URL('./data/', import.meta.url))
const verifierPath = fileURLToPath(new URL('./data/admin-bootstrap.json', import.meta.url))
const databasePath = fileURLToPath(new URL('./data/retail.sqlite', import.meta.url))
const name = process.env.INITIAL_ADMIN_NAME?.trim()
const password = process.env.INITIAL_ADMIN_PASSWORD

if (!name || !password || password.length < 8) {
  console.error('Set INITIAL_ADMIN_NAME and an INITIAL_ADMIN_PASSWORD of at least 8 characters before setup.')
  process.exitCode = 1
} else if (existsSync(verifierPath)) {
  console.error('A bootstrap verifier already exists. It will not be overwritten.')
  process.exitCode = 1
} else {
  let adminAlreadyRegistered = false
  if (existsSync(databasePath)) {
    try {
      const connection = new DatabaseSync(databasePath)
      adminAlreadyRegistered = Boolean(connection.prepare('SELECT id FROM admin WHERE id = 1').get())
      connection.close()
    } catch {
      adminAlreadyRegistered = false
    }
  }

  if (adminAlreadyRegistered) {
    console.error('An admin is already registered in this database.')
    process.exitCode = 1
  } else {
    mkdirSync(dataDirectory, { recursive: true })
    const salt = randomBytes(16)
    const passwordHash = scryptSync(password, salt, 64, { N: 32_768, r: 8, p: 1, maxmem: 67_108_864 })
    writeFileSync(verifierPath, `${JSON.stringify({ name, salt: salt.toString('hex'), passwordHash: passwordHash.toString('hex') }, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
    console.log('Local bootstrap verifier created. The raw password was not saved.')
  }
}