import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleApi } from './api.js'

const distributionDirectory = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

const server = createServer(async (request, response) => {
  if (await handleApi(request, response)) return

  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname)
    const candidate = resolve(distributionDirectory, `.${pathname}`)
    if (candidate !== distributionDirectory && !candidate.startsWith(`${distributionDirectory}${sep}`)) {
      response.writeHead(403).end('Forbidden')
      return
    }
    let filePath = candidate
    try {
      if (!(await stat(filePath)).isFile()) filePath = resolve(distributionDirectory, 'index.html')
    } catch {
      filePath = resolve(distributionDirectory, 'index.html')
    }
    const content = await readFile(filePath)
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' })
    response.end(content)
  } catch {
    response.writeHead(400).end('Invalid request')
  }
})

const port = Number(process.env.PORT || 5173)
server.listen(port, '127.0.0.1', () => {
  console.log(`Retail dashboard listening at http://127.0.0.1:${port}`)
})