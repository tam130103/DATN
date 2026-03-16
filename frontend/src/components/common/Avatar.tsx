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
  xs: 'h-5 w-5 text-[8px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-[150px] w-[150px] text-4xl',
};

export const Avatar: React.FC<AvatarProps> = ({ src, name, username, size = 'md', className = '', ring }) => {
  const sizeClass = sizeMap[size];
  const initials = (name || username || '?').charAt(0).toUpperCase();

  if (src) {
    return (
      <div className={`${ring ? 'rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]' : ''}`}>
        <img
          src={src}
          alt={name || username || 'Avatar'}
          className={`${sizeClass} rounded-full object-cover ${ring ? 'border-2 border-white' : ''} ${className}`}
        />
      </div>
    );
  }

  return (
    <div className={`${ring ? 'rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]' : ''}`}>
      <div className={`${sizeClass} flex items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600 ${ring ? 'border-2 border-white' : ''} ${className}`}>
        {initials}
      </div>
    </div>
  );
};
