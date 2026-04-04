
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
  <React.StrictMode>
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
  </React.StrictMode>
);
