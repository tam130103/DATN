import React, { useEffect, useRef } from 'react';
import { X } from '@phosphor-icons/react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  titleId: externalTitleId,
  children,
  footer,
  size = 'md',
}) => {
  const generatedTitleId = React.useId();
  const titleId = externalTitleId || `${generatedTitleId}-title`;
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    previousActiveRef.current = document.activeElement;
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'textarea:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(focusableSelectors);
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the previously active element when modal closes
      if (previousActiveRef.current instanceof HTMLElement) {
        previousActiveRef.current.focus();
      }
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(28,30,33,0.72)] p-4 backdrop-blur-sm"
      role="presentation"
      style={{ overscrollBehavior: 'contain' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`glass-panel w-full ${sizeMap[size]} rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-lg)] focus-visible:outline-none`}
      >
        <div className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold leading-6 text-[var(--app-text)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="btn-tactile spring-ease -mr-2 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-bg)] hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--app-border)] px-5 py-4">
            {footer}
          </div>
        ) : null}
      </section>
    </div>
  );
};
