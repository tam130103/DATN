import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
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
    </QueryClientProvider>
  </React.StrictMode>,
);
