import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';

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
    if (!email || !password || !confirmPassword) {
      toast.error('Vui lòng điền đầy đủ các trường.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Mật khẩu không khớp.');
      return;
    }
    if (password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setIsRegistering(true);
    try {
      await register(email, password, name || undefined);
      navigate('/feed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đăng ký thất bại.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <AuthLayout
      badge="Tạo tài khoản"
      title="Tạo tài khoản của bạn"
      description="Bắt đầu chia sẻ bài viết và tin nhắn."
      footerText="Bạn đã có tài khoản?"
      footerLinkLabel="Đăng nhập"
      footerLinkTo="/login"
    >
      <p className="mb-5 text-center text-sm font-semibold leading-5 text-[var(--app-muted)]">
        Đăng ký để xem ảnh, video và cập nhật từ cộng đồng của bạn.
      </p>

      <form onSubmit={handleRegister} className="space-y-3" data-testid="register-form">
        <input
          id="register-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Số điện thoại hoặc email"
          data-testid="register-email"
          autoComplete="email"
          className="min-h-[44px] w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-3 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-strong)]"
        />

        <input
          id="register-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Họ và tên"
          data-testid="register-name"
          autoComplete="name"
          className="min-h-[44px] w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-3 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-strong)]"
        />

        <input
          id="register-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Mật khẩu"
          data-testid="register-password"
          autoComplete="new-password"
          className="min-h-[44px] w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-3 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-strong)]"
        />

        <input
          id="register-confirm-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
          placeholder="Xác nhận mật khẩu"
          data-testid="register-confirm-password"
          autoComplete="new-password"
          className="min-h-[44px] w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-3 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-strong)]"
        />

        <p className="rounded-md bg-[var(--app-bg-soft)] px-3 py-2.5 text-center text-xs leading-5 text-[var(--app-muted)]">
          Bằng cách đăng ký, bạn đồng ý với Điều khoản, Chính sách dữ liệu và Chính sách cookie của chúng tôi.
        </p>

        <button
          type="submit"
          disabled={isRegistering || isLoading}
          data-testid="register-submit"
          className="min-h-[44px] w-full rounded-md bg-[var(--app-primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)] disabled:opacity-50"
        >
          {isRegistering ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
