import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Force a single React instance — without this, Vite's dep pre-bundling can
  // hand component libraries (e.g. @phosphor-icons/react) a second copy of
  // React, triggering "Invalid hook call".
  resolve: { dedupe: ['react', 'react-dom'] },
  server: {
    host: true,   // listen on all interfaces (0.0.0.0), accessible on LAN
    proxy: {
      // Forward /api and /uploads requests to the Express backend
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
})
