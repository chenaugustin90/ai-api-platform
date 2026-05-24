import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'frontend',
  plugins: [react()],
  define: {
    'process.env.FRONTEND_URL': JSON.stringify(process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || ''),
    'process.env.BACKEND_URL': JSON.stringify(process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || process.env.VITE_API_URL || '')
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
