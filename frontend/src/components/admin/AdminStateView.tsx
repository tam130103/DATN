import React from 'react';
import { StatePanel } from '../common/StatePanel';

interface AdminStateViewProps {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const AdminStateView: React.FC<AdminStateViewProps> = ({
  title,
  description,
  onRetry,
  retryLabel = 'Thu lai',
}) => {
  return (
    <StatePanel
      title={title}
      description={description}
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-[38px] items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)]"
          >
            {retryLabel}
          </button>
        ) : undefined
      }
    />
  );
};
