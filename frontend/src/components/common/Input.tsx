import React, { forwardRef, useId } from 'react';

interface InputProps {
  label?: string;
  error?: string;
  helperText?: string;
  multiline?: boolean;
  rows?: number;
}

export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps & React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ label, error, helperText, multiline, rows, className = '', id: externalId, ...rest }, ref) => {
  const generatedId = useId();
  const inputId = externalId || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText && !error ? `${inputId}-helper` : undefined;
  const base = `w-full rounded-lg border bg-[var(--app-surface)] px-4 py-2.5 text-sm leading-6 text-[var(--app-text)] placeholder:text-[var(--app-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors spring-ease disabled:cursor-not-allowed disabled:opacity-50 ${
    error
      ? 'border-[var(--app-danger)] focus-visible:outline-[var(--app-danger)]'
      : 'border-[var(--app-border)] focus-visible:outline-[var(--app-primary)]'
  } ${className}`;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--app-text)]">
          {label}
        </label>
      ) : null}
      {multiline ? (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          id={inputId}
          rows={rows ?? 4}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId || helperId}
          className={`${base} resize-none`}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId || helperId}
          className={`${base} h-[42px]`}
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error ? (
        <p id={errorId} className="text-sm text-[var(--app-danger)]" aria-live="polite" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-sm text-[var(--app-muted)]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
