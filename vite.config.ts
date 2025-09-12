import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '.',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  optimizeDeps: {
    exclude: ['@novnc/novnc'],
    esbuildOptions: {
      target: 'es2022',
      supported: { 'top-level-await': true },
      banner: '// Top-level await support',
    },
  },
  server: {
    port: 3000,
    strictPort: false, // Allow port fallback for Replit
    host: '0.0.0.0',
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '*.replit.dev',
      '*.replit.co',
      '*.repl.co',
      /^.*\.replit\.dev$/,
      /^.*\.replit\.co$/,
      /^.*\.repl\.co$/,
    ],
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
    proxy: {
      // LibreChat UI
      '/chat': {
        target: process.env.VITE_LIBRECHAT_INTERNAL_URL || 'http://localhost:3080',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // Marketplace and agents APIs to agent marketplace backend
      '/api/marketplace': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        timeout: 60000,
      },
      '/api/agents': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        timeout: 60000,
      },
      // API proxy to main backend
      '/api': {
        target: process.env.VITE_BACKEND_INTERNAL_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        timeout: 60000,
      },
      // WebSocket proxy
      '/ws': {
        target: process.env.VITE_BACKEND_INTERNAL_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // VNC proxy for session viewing
      '/vnc': {
        target: process.env.VITE_VNC_INTERNAL_URL || 'http://localhost:6080',
        changeOrigin: true,
        secure: false,
      },
      // Jupyter proxy for session notebooks
      '/jupyter': {
        target: 'http://localhost:6080',
        changeOrigin: true,
        secure: false,
      },
      // Debug proxy for browser debugging
      '/debug': {
        target: 'http://localhost:9222',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  build: {
    outDir: './dist',
    sourcemap: true,
    target: 'esnext',
  },
  define: {
    'process.env': {},
  },
});
