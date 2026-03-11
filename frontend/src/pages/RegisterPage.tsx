import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, isAuthenticated } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/feed" replace />;
  }

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email || !password || !confirmPassword) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setIsRegistering(true);
    try {
      await register(email, password, name || undefined);
      navigate('/feed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/70 bg-white/88 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur lg:grid lg:grid-cols-[0.95fr,1.05fr]">
        <div className="px-8 py-10 lg:px-10 lg:py-12">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Onboarding</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Create your account</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Set up your identity, then move straight into the feed, profile editing, notifications, and chat workspace.
          </p>

          <form onSubmit={handleRegister} className="mt-8 space-y-4">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Display name (optional)"
              className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            />
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
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
              className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            />
            <button
              type="submit"
              disabled={isRegistering || isLoading}
              className="w-full rounded-[24px] bg-slate-900 px-4 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isRegistering ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-8 text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-slate-900 transition hover:text-cyan-700">
              Sign in instead
            </Link>
          </p>
        </div>

        <div className="bg-slate-900 px-8 py-10 text-white lg:px-10 lg:py-12">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">What you unlock</p>
          <div className="mt-6 space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <h2 className="text-xl font-semibold">Publish media-rich posts</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">Upload images or videos directly to the backend and publish them into the shared feed.</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <h2 className="text-xl font-semibold">Discover people and hashtags</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">Search the workspace, follow accounts, and pivot into topic streams.</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <h2 className="text-xl font-semibold">Stay synced in realtime</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">Review alerts, join direct chats, and start group threads as soon as your account is active.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
