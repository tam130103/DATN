import React from 'react';
import { Spinner } from '@phosphor-icons/react';

const variantStyles = {
  primary:
    'bg-[var(--app-primary)] text-white hover:bg-[var(--app-primary-strong)] disabled:bg-[var(--app-border)] disabled:text-[var(--app-muted)]',
  outline:
    'border border-[var(--app-primary)] text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)] disabled:border-[var(--app-border)] disabled:text-[var(--app-muted)]',
  ghost:
    'text-[var(--app-text)] hover:bg-[var(--app-bg)] disabled:text-[var(--app-muted)]',
  danger:
    'bg-[var(--app-danger)] text-white hover:opacity-90 disabled:bg-[var(--app-border)] disabled:text-[var(--app-muted)]',
};

const sizeStyles = {
  sm: 'min-h-[32px] px-3 py-1 text-xs gap-1',
  md: 'min-h-[40px] px-4 py-2 text-sm gap-1.5',
  lg: 'min-h-[44px] px-6 py-2.5 text-sm gap-2',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...rest
}) => {
  return (
    <button
      className={`btn-tactile spring-ease inline-flex items-center justify-center rounded-lg font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)] disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={16} className="animate-spin" aria-hidden="true" /> : icon}
      {children ? <span>{children}</span> : null}
    </button>
  );
};
