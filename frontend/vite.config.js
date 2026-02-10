import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// Check if SSL certificates exist (optional for Linux)
const hasSSL = fs.existsSync('./key.pem') && fs.existsSync('./cert.pem')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3030,
    host: true,
    ...(hasSSL && {
      https: {
        key: fs.readFileSync('./key.pem'),
        cert: fs.readFileSync('./cert.pem'),
      },
    }),
  },
})
