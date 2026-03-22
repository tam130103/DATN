import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from '../components/branding/BrandLogo';

declare global {
  interface Window { google: any; }
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
          try { await loginWithGoogle(response.credential); navigate('/feed'); }
          catch { toast.error('Google login failed.'); }
          finally { setIsGoogleLoading(false); }
        },
        auto_select: false,
      });
      window.google.accounts.id.renderButton(document.getElementById('google-signin-button'), {
        theme: 'outline', size: 'large', text: 'signin_with',
      });
    };
    const existingScript = document.querySelector('script[data-google-gsi="true"]');
    if (existingScript) { initializeGoogleButton(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true; script.defer = true;
    script.dataset.googleGsi = 'true';
    script.onload = initializeGoogleButton;
    document.body.appendChild(script);
  }, [loginWithGoogle, navigate]);

  if (!isLoading && isAuthenticated) return <Navigate to="/feed" replace />;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields.'); return; }
    setIsLoggingIn(true);
    try { await login(email, password); navigate('/feed'); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Login failed.'); }
    finally { setIsLoggingIn(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-10">
      <div className="w-full max-w-[350px] space-y-3">
        {/* Card */}
        <div className="border border-[#dbdbdb] bg-white px-10 py-10 text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <BrandLogo variant="full" className="h-auto w-[220px] max-w-full" />
          </div>

          <form onSubmit={handleLogin} className="space-y-2" data-testid="login-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Phone number, username, or email"
              data-testid="login-email"
              autoComplete="username"
              className="w-full rounded-sm border border-[#dbdbdb] bg-[#fafafa] px-2 py-2 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-[#0095f6]"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              data-testid="login-password"
              autoComplete="current-password"
              className="w-full rounded-sm border border-[#dbdbdb] bg-[#fafafa] px-2 py-2 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-[#0095f6]"
            />
            <button
              type="submit"
              disabled={isLoggingIn || isLoading || !email || !password}
              data-testid="login-submit"
              className="mt-2 w-full min-h-[44px] sm:min-h-0 rounded-lg bg-[#0095f6] py-1.5 text-sm font-semibold text-white transition hover:bg-[#1877f2] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0095f6] focus-visible:outline-none"
            >
              {isLoggingIn ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          {/* OR divider */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#dbdbdb]" />
            <span className="text-[13px] font-semibold text-[#8e8e8e]">OR</span>
            <div className="h-px flex-1 bg-[#dbdbdb]" />
          </div>

          <div id="google-signin-button" className="flex justify-center" />
          {isGoogleLoading && <p className="mt-2 text-xs text-[#8e8e8e]">Signing in...</p>}

          <Link to="#" className="mt-4 block text-xs text-[#00376b]">Forgot password?</Link>
        </div>

        {/* Sign up */}
        <div className="border border-[#dbdbdb] bg-white px-10 py-5 text-center text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-[#0095f6]">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
