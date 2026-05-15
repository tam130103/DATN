import React, { useEffect, useRef, useState } from 'react';

interface PromptDialogProps {
  open: boolean;
  title: string;
  description: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  cancelLabel?: string;
  initialValue?: string;
  required?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export const PromptDialog: React.FC<PromptDialogProps> = ({
  open,
  title,
  description,
  label,
  placeholder,
  confirmLabel,
  cancelLabel = 'Hủy',
  initialValue = '',
  required = true,
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    setValue(initialValue);
    setError('');
    window.setTimeout(() => inputRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [initialValue, onCancel, open]);

  if (!open) return null;

  const handleConfirm = () => {
    const nextValue = value.trim();
    if (required && !nextValue) {
      setError('Vui lòng nhập nội dung trước khi tiếp tục.');
      inputRef.current?.focus();
      return;
    }
    onConfirm(nextValue);
  };

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
        aria-labelledby="prompt-dialog-title"
        className="glass-panel w-full max-w-md rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-lg)]"
      >
        <h2 id="prompt-dialog-title" className="text-lg font-semibold leading-6 text-[var(--app-text)]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted-strong)]">{description}</p>

        <label htmlFor="prompt-dialog-input" className="mt-5 block text-sm font-medium text-[var(--app-text)]">
          {label}
        </label>
        <textarea
          ref={inputRef}
          id="prompt-dialog-input"
          name="prompt-dialog-input"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError('');
          }}
          rows={4}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'prompt-dialog-error' : undefined}
          className="mt-2 min-h-[104px] w-full resize-none rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-sm leading-6 text-[var(--app-text)] placeholder:text-[var(--app-muted)] focus:border-[var(--app-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
        />
        {error ? (
          <p id="prompt-dialog-error" className="mt-2 text-sm text-[var(--app-danger)]" aria-live="polite">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-tactile spring-ease inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-semibold text-[var(--app-text)] hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="btn-tactile spring-ease inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[var(--app-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--app-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
};

