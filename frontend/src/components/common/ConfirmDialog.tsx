import React from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { Modal } from './Modal';
import { Button } from './Button';

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
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
          <WarningCircle size={22} weight="bold" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm leading-6 text-[var(--app-muted-strong)]">{description}</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} loading={isLoading} onClick={onConfirm}>
          {isLoading ? 'Đang xử lý…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};

