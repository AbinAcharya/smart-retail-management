import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { handleApi } from './server/api.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'retail-data-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.startsWith('/api/')) {
          void handleApi(request, response)
          return
        }
        next()
      })
    },
  }],
})
