
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import './i18n';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { BrowserRouter } from 'react-router-dom';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error capturado:', error, errorInfo);
    
    // Auto-reload on chunk load / dynamic import failure
    const isChunkError = 
      error && error.message && (
        error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('Loading chunk') ||
        error.message.includes('dynamic import')
      );
      
    if (isChunkError) {
      const lastReload = sessionStorage.getItem('last-chunk-reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem('last-chunk-reload', now.toString());
        console.warn('Chunk loading / dynamic import error detected. Reloading page...');
        window.location.reload();
      }
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
          <div className="text-center max-w-lg">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-4">Algo salió mal</h1>
            <p className="text-slate-400 mb-6">{this.state.error?.message || 'Error desconocido'}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-orange-500 text-white font-black rounded-xl"
            >
              Recargar Página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <DataProvider>
            <App />
          </DataProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

if ('serviceWorker' in navigator) {
  // En entorno local o modo dev, desregistramos SWs y limpiamos cachés para que Antigravity/desarrollo no lea versiones viejas
  if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
        console.log('[Dev] Service Worker desregistrado para desarrollo limpio');
      }
    });
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          console.log('[SW] Registrado con éxito. Scope:', registration.scope);
          // Forzar chequeo de nueva versión de inmediato
          registration.update();
          window.addEventListener('focus', () => {
            registration.update();
          });
        })
        .catch((error) => {
          console.log('[SW] Fallo al registrar:', error);
        });

      // Recargar automáticamente cuando un nuevo Service Worker tome el control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }
}
