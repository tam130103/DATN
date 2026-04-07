import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
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
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3200,
            style: {
              borderRadius: '12px',
              border: '1px solid #dbdbdb',
              background: '#ffffff',
              color: '#262626',
              boxShadow: '0 10px 28px rgba(0, 0, 0, 0.08)',
            },
            success: {
              iconTheme: {
                primary: '#0095f6',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ed4956',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
