import React, { useState } from 'react';

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

const DEFAULT_AVATAR =
  import.meta.env.VITE_DEFAULT_AVATAR_URL ||
  'https://res.cloudinary.com/dctovnwlk/image/upload/v1775806448/datn-social/defaults/default-avatar.jpg';

const FALLBACK_AVATAR =
  'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23999"><circle cx="12" cy="8" r="4"/><path d="M12 14c-5 0-8 2.5-8 6v2h16v-2c0-3.5-3-6-8-6z"/></svg>'
  );

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  username,
  size = 'md',
  className = '',
  ring,
}) => {
  const [imgError, setImgError] = useState(false);
  const sizeClass = sizeMap[size];
  const wrapperClass = ring
    ? 'inline-flex rounded-full bg-[linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)] p-[2px]'
    : 'inline-flex';
  const innerClass = `${sizeClass} rounded-full border border-[var(--app-border)] bg-[#efefef] object-cover ${ring ? 'border-2 border-white' : ''} ${className}`.trim();

  const imgSrc = imgError ? FALLBACK_AVATAR : (src || DEFAULT_AVATAR);

  return (
    <div className={wrapperClass}>
      <img
        src={imgSrc}
        alt={name || username || 'Avatar'}
        className={innerClass}
        onError={() => setImgError(true)}
      />
    </div>
  );
};
