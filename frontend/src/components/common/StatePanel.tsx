import React from 'react';

interface StatePanelProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const StatePanel: React.FC<StatePanelProps> = ({ title, description, action }) => {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
        {title.slice(0, 2).toUpperCase()}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
};
