// vite.config.js
export default {
  server: {
    host: 'localhost', // Only listen on localhost
    port: 5173,
    open: true, // Auto-open the browser
    strictPort: false, // Allow fallback to another port if 5173 is in use
    cors: true // Enable CORS for all requests
  },
  build: {
    sourcemap: true
  }
} 