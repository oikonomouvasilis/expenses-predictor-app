import { defineConfig } from 'vite' // Main configuration helper for Vite
import react from '@vitejs/plugin-react' // Official React plugin for Vite (HMR and JSX support)

export default defineConfig({
  plugins: [react()], // Enable the React plugin
  server: {
    port: 5173, // Set the development server to port 5173
    proxy: {
      // Configuration for the proxy server:
      // When the frontend calls /api, it is redirected to the Python backend on port 8000
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true, // Necessary for cross-origin requests in development
      }
    }
  }
})