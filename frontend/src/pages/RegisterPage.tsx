import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';

const inputClass =
  'min-h-[38px] w-full border-0 border-b border-[var(--app-border)] bg-white px-3 pb-[1px] pt-[18px] text-[15px] font-medium text-[var(--app-text)] transition-colors placeholder:text-[var(--app-muted)] focus:border-b-2 focus:border-[var(--app-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]';

const FieldValidIcon: React.FC<{ show: boolean }> = ({ show }) =>
  show ? (
    <CheckCircle
      size={18}
      weight="fill"
      className="float-in absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-success)]"
      aria-hidden="true"
    />
  ) : null;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, isAuthenticated } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const validation = useMemo(
    () => ({
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      password: password.length >= 6,
      confirmPassword: Boolean(confirmPassword) && password === confirmPassword,
      name: name.trim().length >= 2,
    }),
    [confirmPassword, email, name, password],
  );

  if (!isLoading && isAuthenticated) return <Navigate to="/feed" replace />;

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password || !confirmPassword) {
      toast.error('Vui lòng điền đầy đủ các trường.');
      return;
    }
    if (!validation.email) {
      toast.error('Email chưa đúng định dạng.');
      return;
    }
    if (!validation.password) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (!validation.confirmPassword) {
      toast.error('Mật khẩu không khớp.');
      return;
    }

    setIsRegistering(true);
    try {
      await register(email, password, name || undefined);
      navigate('/feed');
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response: { data: { message: string } } }).response.data.message
          : 'Đăng ký thất bại.';
      toast.error(message);
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
        <div className="float-in stagger-1 relative opacity-0">
          <label htmlFor="register-email" className="sr-only">
            Email
          </label>
          <input
            id="register-email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="Số điện thoại hoặc email"
            data-testid="register-email"
            autoComplete="email"
            spellCheck={false}
            className={inputClass}
          />
          <FieldValidIcon show={validation.email} />
        </div>

        <div className="float-in stagger-2 relative opacity-0">
          <label htmlFor="register-name" className="sr-only">
            Họ và tên
          </label>
          <input
            id="register-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Họ và tên"
            data-testid="register-name"
            autoComplete="name"
            className={inputClass}
          />
          <FieldValidIcon show={validation.name} />
        </div>

        <div className="float-in stagger-3 relative opacity-0">
          <label htmlFor="register-password" className="sr-only">
            Mật khẩu
          </label>
          <input
            id="register-password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Mật khẩu"
            data-testid="register-password"
            autoComplete="new-password"
            className={inputClass}
          />
          <FieldValidIcon show={validation.password} />
        </div>

        <div className="float-in stagger-4 relative opacity-0">
          <label htmlFor="register-confirm-password" className="sr-only">
            Xác nhận mật khẩu
          </label>
          <input
            id="register-confirm-password"
            name="confirm-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            placeholder="Xác nhận mật khẩu"
            data-testid="register-confirm-password"
            autoComplete="new-password"
            className={inputClass}
          />
          <FieldValidIcon show={validation.confirmPassword} />
        </div>

        <p className="rounded-md bg-[var(--app-bg-soft)] px-3 py-2.5 text-center text-xs leading-5 text-[var(--app-muted)]">
          Bằng cách đăng ký, bạn đồng ý với Điều khoản, Chính sách dữ liệu và Chính sách cookie của chúng tôi.
        </p>

        <button
          type="submit"
          disabled={isRegistering || isLoading}
          data-testid="register-submit"
          className="btn-tactile spring-ease min-h-[44px] w-full rounded-md bg-[var(--app-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--app-primary-strong)] disabled:bg-[var(--app-border)] disabled:text-[var(--app-muted)]"
        >
          {isRegistering ? <span className="skeleton inline-block h-4 w-24 bg-white/30 align-middle" /> : 'Đăng ký'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
