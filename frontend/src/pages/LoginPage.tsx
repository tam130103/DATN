import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { API_URL } from '../services/api';

declare global {
  interface Window {
    google: any;
  }
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading, isAuthenticated } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const googleError = searchParams.get('google_error');
    if (!googleError) {
      return;
    }

    toast.error(googleError);
    navigate('/login', { replace: true });
  }, [navigate, searchParams]);

  useEffect(() => {
    const initializeGoogleButton = () => {
      if (!window.google) {
        return;
      }

      const isLocalHost =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const loginUri = isLocalHost
        ? `${API_URL}/api/v1/auth/google/redirect`
        : `${window.location.origin}/api/auth/google/redirect`;

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
        auto_select: false,
        ux_mode: 'redirect',
        login_uri: loginUri,
      });

      window.google.accounts.id.renderButton(document.getElementById('google-signin-button'), {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        width: 280,
      });
    };

    const existingScript = document.querySelector('script[data-google-gsi="true"]');
    if (existingScript) {
      initializeGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = 'true';
    script.onload = initializeGoogleButton;
    document.body.appendChild(script);
  }, []);

  if (!isLoading && isAuthenticated) return <Navigate to="/feed" replace />;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      toast.error('Vui long dien day du cac truong.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await login(email, password);
      navigate('/feed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Dang nhap that bai.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <AuthLayout
      badge="Chao mung tro lai"
      title="Dang nhap"
      description="Kham pha bang tin, tin nhan va ho so ca nhan cua ban."
      footerText="Ban chua co tai khoan?"
      footerLinkLabel="Dang ky"
      footerLinkTo="/register"
    >
      <form onSubmit={handleLogin} className="space-y-3" data-testid="login-form">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-xs font-medium text-[var(--app-muted)]">
            So dien thoai, ten nguoi dung hoac email
          </label>
          <input
            id="login-email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="So dien thoai, ten nguoi dung hoac email"
            data-testid="login-email"
            autoComplete="username"
            className="min-h-[44px] w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-3 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-strong)]"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="login-password"
            className="text-xs font-medium text-[var(--app-muted)]"
          >
            Mat khau
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mat khau"
            data-testid="login-password"
            autoComplete="current-password"
            className="min-h-[44px] w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-3 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-strong)]"
          />
        </div>

        <button
          type="submit"
          disabled={isLoggingIn || isLoading || !email || !password}
          data-testid="login-submit"
          className="min-h-[44px] w-full rounded-md bg-[var(--app-primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)] disabled:opacity-50"
        >
          {isLoggingIn ? 'Dang dang nhap...' : 'Dang nhap'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-4">
        <div className="h-px flex-1 bg-[var(--app-border)]" />
        <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--app-muted)]">
          hoac
        </span>
        <div className="h-px flex-1 bg-[var(--app-border)]" />
      </div>

      <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-5">
        <div id="google-signin-button" className="flex justify-center" />
        <p className="mt-3 text-center text-sm text-[var(--app-muted)]">
          Google se tiep tuc dang nhap tren cung tab de tranh bi chan popup.
        </p>
      </div>

      <div className="mt-5 text-center">
        <Link
          to="#"
          className="text-xs font-semibold text-[#385185] transition hover:opacity-80"
        >
          Quen mat khau?
        </Link>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
