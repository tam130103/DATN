import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

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
    if (!open) return;
    setValue(initialValue);
    setError('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [initialValue, open]);

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
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="mt-2 text-sm leading-6 text-[var(--app-muted-strong)]">{description}</p>

      <div className="mt-5">
        <Input
          ref={inputRef}
          label={label}
          multiline
          rows={4}
          placeholder={placeholder}
          value={value}
          error={error}
          onChange={(event) => {
            setValue((event.target as HTMLTextAreaElement).value);
            if (error) setError('');
          }}
          aria-required={required}
        />
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button onClick={handleConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
};

