import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3010',
          changeOrigin: true
        }
      }
    },
    plugins: [
      react(),
      tailwindcss()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    esbuild: {
      drop: ['console', 'debugger']
    },
    optimizeDeps: {
      esbuildOptions: {
        supported: {
          'import-meta': true
        }
      }
    },
    build: {
      target: 'esnext',
      manifest: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Firebase submodules
            if (id.includes('node_modules/firebase/firestore') || id.includes('node_modules/@firebase/firestore')) {
              return 'firebase-firestore';
            }
            if (id.includes('node_modules/firebase/auth') || id.includes('node_modules/@firebase/auth')) {
              return 'firebase-auth';
            }
            if (id.includes('node_modules/firebase/storage') || id.includes('node_modules/@firebase/storage')) {
              return 'firebase-storage';
            }
            if (id.includes('node_modules/firebase/messaging') || id.includes('node_modules/@firebase/messaging')) {
              return 'firebase-messaging';
            }
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'firebase-core';
            }
            // React core — siempre necesario
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
              return 'vendor-react';
            }
            // Leaflet — solo necesario en la vista del mapa
            if (id.includes('node_modules/leaflet')) {
              return 'leaflet';
            }
            // i18n — puede cambiar independientemente
            if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
              return 'i18n';
            }
            // Utilidades de fecha
            if (id.includes('node_modules/date-fns')) {
              return 'date-fns';
            }
            // Markdown renderer
            if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark') || id.includes('node_modules/rehype')) {
              return 'markdown';
            }
            // QR code
            if (id.includes('node_modules/qrcode') || id.includes('node_modules/html5-qrcode') || id.includes('node_modules/qrcode.react')) {
              return 'qr';
            }
            // Iconos — tree-shaking maneja lo no usado
            if (id.includes('node_modules/lucide-react') || id.includes('node_modules/react-icons')) {
              return 'icons';
            }
          }
        }
      }
    }
  };
});
