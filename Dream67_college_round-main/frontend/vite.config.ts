import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The agent backend (FastAPI) runs on http://127.0.0.1:8000.
// These paths are proxied so the browser sees everything as same-origin
// in dev (no CORS needed).
const backend = 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/runs': { target: backend, changeOrigin: true },
      '/health': { target: backend, changeOrigin: true },
    },
  },
});
