import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_DEV_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/models': {
          target: env.VITE_DEV_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
