import React from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  username?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-11 w-11 text-base',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

const joinClasses = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ');

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  username,
  size = 'md',
  className,
}) => {
  const label = name || username || 'User';
  const initial = label.trim().charAt(0).toUpperCase() || 'U';

  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className={joinClasses(
          'rounded-[22px] object-cover ring-1 ring-black/5',
          sizeMap[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={joinClasses(
        'flex items-center justify-center rounded-[22px] bg-gradient-to-br from-orange-300 via-rose-300 to-cyan-300 font-semibold text-slate-900 shadow-sm ring-1 ring-black/5',
        sizeMap[size],
        className,
      )}
      aria-label={label}
    >
      {initial}
    </div>
  );
};
