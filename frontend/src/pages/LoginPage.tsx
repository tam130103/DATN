import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

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
            toast.error('Google login failed.');
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

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/feed" replace />;
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in both email and password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await login(email, password);
      navigate('/feed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/70 bg-white/88 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur lg:grid lg:grid-cols-[1.1fr,0.9fr]">
        <div className="bg-slate-900 px-8 py-10 text-white lg:px-10 lg:py-12">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">DATN Social</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Build a thesis-grade social experience around content, chat, and discovery.</h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-white/70">
            Sign in to manage your profile, publish media posts, react in realtime, follow people, and keep conversations active through direct or group messaging.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-white/45">Modules</p>
              <p className="mt-2 text-lg font-semibold">Feed, chat, alerts</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-white/45">Realtime</p>
              <p className="mt-2 text-lg font-semibold">Notifications and typing state</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-10 lg:px-10 lg:py-12">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Session</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Use email/password or continue with Google.</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            />
            <button
              type="submit"
              disabled={isLoggingIn || isLoading}
              className="w-full rounded-[24px] bg-slate-900 px-4 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-[0.3em] text-slate-300">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div id="google-signin-button" className="flex justify-center" />
          {isGoogleLoading ? <p className="mt-3 text-center text-sm text-slate-500">Signing in with Google...</p> : null}

          <p className="mt-8 text-sm text-slate-500">
            Need an account?{' '}
            <Link to="/register" className="font-semibold text-slate-900 transition hover:text-cyan-700">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
