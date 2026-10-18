import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development the app calls /v1 on its own origin and Vite forwards it to the API,
    // so the API's CORS_ORIGINS only needs the production address.
    proxy: {
      '/v1': {
        target: 'https://rag-api.diegodebrun.com',
        changeOrigin: true,
      },
    },
  },
})
