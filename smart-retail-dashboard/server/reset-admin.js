import { randomBytes, scryptSync } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const name = process.env.INITIAL_ADMIN_NAME?.trim()
const password = process.env.INITIAL_ADMIN_PASSWORD

if (!name || !password || password.length < 12) {
  console.error('Set INITIAL_ADMIN_NAME and an INITIAL_ADMIN_PASSWORD of at least 12 characters.')
  process.exitCode = 1
} else {
  const database = new DatabaseSync(fileURLToPath(new URL('./data/retail.sqlite', import.meta.url)))
  try {
    const admin = database.prepare('SELECT name FROM admin WHERE id = 1').get()
    if (!admin) {
      console.error('No admin is registered in this database.')
      process.exitCode = 1
    } else if (admin.name.toLocaleLowerCase() !== name.toLocaleLowerCase()) {
      console.error('The supplied admin name does not match the registered account.')
      process.exitCode = 1
    } else {
      const salt = randomBytes(16)
      const passwordHash = scryptSync(password, salt, 64, { N: 32_768, r: 8, p: 1, maxmem: 67_108_864 })
      database.prepare('UPDATE admin SET salt = ?, password_hash = ? WHERE id = 1').run(salt.toString('hex'), passwordHash.toString('hex'))
      console.log('Admin password updated. The raw password was not saved.')
    }
  } finally {
    database.close()
  }
}
