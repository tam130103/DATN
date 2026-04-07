import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';

declare global {
  interface Window {
    google: any;
  }
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, isLoading, isAuthenticated } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const initializeGoogleButton = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
        callback: async (response: any) => {
          setIsGoogleLoading(true);
          try {
            await loginWithGoogle(response.credential);
            navigate('/feed');
          } catch {
            toast.error('Đăng nhập Google thất bại.');
          } finally {
            setIsGoogleLoading(false);
          }
        },
        auto_select: false,
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
  }, [loginWithGoogle, navigate]);

  if (!isLoading && isAuthenticated) return <Navigate to="/feed" replace />;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      toast.error('Vui lòng điền đầy đủ các trường.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await login(email, password);
      navigate('/feed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <AuthLayout
      badge="Chào mừng trở lại"
      title="Đăng nhập"
      description="Khám phá bảng tin, tin nhắn và hồ sơ cá nhân của bạn."
      footerText="Bạn chưa có tài khoản?"
      footerLinkLabel="Đăng ký"
      footerLinkTo="/register"
    >
      <form onSubmit={handleLogin} className="space-y-3" data-testid="login-form">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-xs font-medium text-[var(--app-muted)]">
            Số điện thoại, tên người dùng hoặc email
          </label>
          <input
            id="login-email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Số điện thoại, tên người dùng hoặc email"
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
            Mật khẩu
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
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
          {isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-4">
        <div className="h-px flex-1 bg-[var(--app-border)]" />
        <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--app-muted)]">
          hoặc
        </span>
        <div className="h-px flex-1 bg-[var(--app-border)]" />
      </div>

      <div className="rounded-md border border-[var(--app-border)] bg-white px-4 py-5">
        <div id="google-signin-button" className="flex justify-center" />
        {isGoogleLoading ? (
          <p className="mt-3 text-center text-sm text-[var(--app-muted)]">
            Đang đăng nhập bằng Google...
          </p>
        ) : null}
      </div>

      <div className="mt-5 text-center">
        <Link
          to="#"
          className="text-xs font-semibold text-[#385185] transition hover:opacity-80"
        >
          Quên mật khẩu?
        </Link>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
