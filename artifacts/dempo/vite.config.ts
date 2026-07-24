import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// Dev server port and base path. Defaulted so the build/dev server work
// anywhere (Replit set these explicitly; locally/CI they are optional).
const parsedPort = Number(process.env.PORT);
const port = Number.isNaN(parsedPort) || parsedPort <= 0 ? 5173 : parsedPort;
const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  // Load env (incl. VITE_* client vars) from the repo root shared .env, not
  // this package dir, so local dev shares one .env with the API server.
  envDir: path.resolve(import.meta.dirname, '..', '..'),
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split large, rarely-changing vendors into their own chunks so the
        // browser caches them across deploys and the initial route payload
        // stays small. Charts/editor only load on the pages that use them.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'wouter'],
          charts: ['recharts'],
          clerk: ['@clerk/react'],
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    // Local dev: forward API calls to the Express server (prod uses a router).
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
