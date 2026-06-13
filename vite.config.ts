import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tourneypool/',
  server: {
    proxy: {
      '/api': {
        target: 'https://tourneypool-api.yusufk.workers.dev',
        changeOrigin: true,
      },
    },
  },
})
