import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function swCacheBusterPlugin(): Plugin {
  const buildVersion = `${Date.now()}`;
  return {
    name: 'sw-cache-buster',
    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        `  <meta name="app-build-version" content="${buildVersion}">\n</head>`
      );
    },
    closeBundle() {
      const swDistPath = path.resolve(__dirname, 'dist/sw.js');
      if (fs.existsSync(swDistPath)) {
        let content = fs.readFileSync(swDistPath, 'utf-8');
        content = content.replace(/const CACHE_VERSION = [^;]+;/, `const CACHE_VERSION = 'ubicame-pulse-v-${buildVersion}';`);
        fs.writeFileSync(swDistPath, content, 'utf-8');
        console.log(`\x1b[32m[Cache-Buster]\x1b[0m Inyectada versión ${buildVersion} en dist/sw.js`);
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isDev = mode === 'development';

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
      tailwindcss(),
      swCacheBusterPlugin()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    esbuild: {
      drop: isDev ? [] : ['console', 'debugger']
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
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
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
