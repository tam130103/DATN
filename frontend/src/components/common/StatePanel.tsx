import React from 'react';

interface StatePanelProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const StatePanel: React.FC<StatePanelProps> = ({ title, description, action }) => {
  return (
    <div className="surface-card rounded-xl p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-soft)] text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--app-muted)]">
        {title.slice(0, 2).toUpperCase()}
      </div>
      <h3 className="text-xl font-semibold text-[var(--app-text)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--app-muted-strong)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
};
