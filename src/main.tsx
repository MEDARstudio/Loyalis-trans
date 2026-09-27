import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure any old service workers are unregistered safely without throwing SecurityError in cross-origin iframes
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  } catch {
    // Ignore SecurityError / DOMException in sandboxed or cross-origin iframes
  }
}

// Global window error suppressor for cross-origin or third-party extension noise
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Unhandled rejection caught gracefully:', event.reason);
  });

  // Guarantee the site favicon with orange square & white LT is set in the tab header
  try {
    const existingIcon = document.querySelector("link[rel='icon'][type='image/svg+xml']") as HTMLLinkElement;
    if (existingIcon) {
      existingIcon.href = `/favicon.svg?v=${Date.now()}`;
    }
  } catch {
    // Ignore in non-DOM environments
  }
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Loyalis Trans caught error:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-2xl font-black uppercase text-white mb-2 tracking-tight">
            Loyalis <span className="text-orange-500">Trans</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-md mb-2">
            Une erreur inattendue est survenue lors du chargement de l'application.
          </p>
          {this.state.error && (
            <p className="text-rose-400 text-xs font-mono max-w-md mb-6 bg-slate-900/80 p-2.5 rounded-lg border border-rose-900/50">
              {this.state.error.message || String(this.state.error)}
            </p>
          )}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
            >
              Recharger la page
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                } catch {}
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              Réinitialiser le cache
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
