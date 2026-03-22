import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from '../components/branding/BrandLogo';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, isAuthenticated } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  if (!isLoading && isAuthenticated) return <Navigate to="/feed" replace />;

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password || !confirmPassword) { toast.error('Please fill in all fields.'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match.'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    setIsRegistering(true);
    try { await register(email, password, name || undefined); navigate('/feed'); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Registration failed.'); }
    finally { setIsRegistering(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-10">
      <div className="w-full max-w-[350px] space-y-3">
        <div className="border border-[#dbdbdb] bg-white px-10 py-10 text-center">
          <div className="mb-3 flex justify-center">
            <BrandLogo variant="full" className="h-auto w-[220px] max-w-full" />
          </div>
          <p className="mb-6 text-base font-semibold text-[#8e8e8e]">
            Sign up to see photos and videos from your friends.
          </p>

          <form onSubmit={handleRegister} className="space-y-2" data-testid="register-form">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Mobile Number or Email"
              data-testid="register-email"
              autoComplete="email"
              className="w-full rounded-sm border border-[#dbdbdb] bg-[#fafafa] px-2 py-2 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-[#0095f6]"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              data-testid="register-name"
              autoComplete="name"
              className="w-full rounded-sm border border-[#dbdbdb] bg-[#fafafa] px-2 py-2 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-[#0095f6]"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              data-testid="register-password"
              autoComplete="new-password"
              className="w-full rounded-sm border border-[#dbdbdb] bg-[#fafafa] px-2 py-2 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-[#0095f6]"
            />
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              placeholder="Confirm Password"
              data-testid="register-confirm-password"
              autoComplete="new-password"
              className="w-full rounded-sm border border-[#dbdbdb] bg-[#fafafa] px-2 py-2 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-[#0095f6]"
            />
            <p className="py-2 text-[11px] text-[#8e8e8e]">
              By signing up, you agree to our <span className="font-semibold text-[#262626]">Terms</span>,{' '}
              <span className="font-semibold text-[#262626]">Privacy Policy</span> and{' '}
              <span className="font-semibold text-[#262626]">Cookies Policy</span>.
            </p>
            <button
              type="submit"
              disabled={isRegistering || isLoading || !email || !password}
              data-testid="register-submit"
              className="w-full min-h-[44px] sm:min-h-0 rounded-lg bg-[#0095f6] py-1.5 text-sm font-semibold text-white transition hover:bg-[#1877f2] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0095f6] focus-visible:outline-none"
            >
              {isRegistering ? 'Signing up...' : 'Sign up'}
            </button>
          </form>
        </div>

        <div className="border border-[#dbdbdb] bg-white px-10 py-5 text-center text-sm">
          Have an account?{' '}
          <Link to="/login" className="font-semibold text-[#0095f6]">Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
