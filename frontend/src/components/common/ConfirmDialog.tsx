import React, { useEffect, useRef } from 'react';
import { WarningCircle } from '@phosphor-icons/react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Hủy',
  variant = 'primary',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-[var(--app-danger)] text-white hover:bg-[var(--app-danger)]'
      : 'bg-[var(--app-primary)] text-white hover:bg-[var(--app-primary-strong)]';

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(28,30,33,0.72)] p-4 backdrop-blur-sm"
      role="presentation"
      style={{ overscrollBehavior: 'contain' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="glass-panel w-full max-w-md rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-lg)]"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
            <WarningCircle size={22} weight="bold" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-lg font-semibold leading-6 text-[var(--app-text)]">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--app-muted-strong)]">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="btn-tactile spring-ease inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-semibold text-[var(--app-text)] hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`btn-tactile spring-ease inline-flex min-h-[40px] items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:bg-[var(--app-border)] disabled:text-[var(--app-muted)] ${confirmClass} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]`}
          >
            {isLoading ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
};

