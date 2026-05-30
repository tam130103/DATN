import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
        <Analytics />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3200,
            style: {
              borderRadius: '12px',
              border: '1px solid var(--app-border)',
              background: 'var(--app-surface)',
              color: 'var(--app-text)',
              boxShadow: 'var(--app-shadow-lg)',
            },
            success: {
              iconTheme: {
                primary: 'var(--app-primary)',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--app-accent)',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
