import React from 'react';

interface StatePanelProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const StatePanel: React.FC<StatePanelProps> = ({ title, description, action }) => {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
        {title.slice(0, 2).toUpperCase()}
      </div>
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 text-sm text-neutral-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
};
