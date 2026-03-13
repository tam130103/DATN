import React from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  username?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
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
          'rounded-full object-cover ring-1 ring-black/5',
          sizeMap[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={joinClasses(
        'flex items-center justify-center rounded-full bg-neutral-200 font-semibold text-neutral-700 ring-1 ring-black/5',
        sizeMap[size],
        className,
      )}
      aria-label={label}
    >
      {initial}
    </div>
  );
};
