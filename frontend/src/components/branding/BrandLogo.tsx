import React from 'react';

interface BrandLogoProps {
  variant?: 'full' | 'mark';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ variant = 'full', className = '' }) => {
  if (variant === 'mark') {
    return (
      <img
        src="/humg-mark.svg"
        alt="HUMG"
        className={`${className} dark:invert dark:hue-rotate-180`}
      />
    );
  }

  return (
    <img
      src="/logo.png"
      alt="HUMG"
      className={`${className} dark:invert dark:hue-rotate-180`}
    />
  );
};
