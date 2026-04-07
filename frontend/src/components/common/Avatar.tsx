import React from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  username?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ring?: boolean;
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-[150px] w-[150px] text-4xl',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  username,
  size = 'md',
  className = '',
  ring,
}) => {
  const sizeClass = sizeMap[size];
  const initials = (name || username || '?').charAt(0).toUpperCase();
  const wrapperClass = ring
    ? 'inline-flex rounded-full bg-[linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)] p-[2px]'
    : 'inline-flex';
  const innerClass = `${sizeClass} rounded-full border border-[var(--app-border)] bg-[#efefef] object-cover ${ring ? 'border-2 border-white' : ''} ${className}`.trim();

  if (src) {
    return (
      <div className={wrapperClass}>
        <img src={src} alt={name || username || 'Avatar'} className={innerClass} />
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div
        className={`${innerClass} flex items-center justify-center bg-[linear-gradient(180deg,#fafafa,#efefef)] font-semibold text-[var(--app-muted-strong)]`}
      >
        {initials}
      </div>
    </div>
  );
};
