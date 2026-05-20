import React from 'react';

interface IconProps {
  className?: string;
}

export const GridIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

export const BookmarkIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
);

export const TagIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 5a4 4 0 00-4 4v2.2c0 .6-.2 1.1-.6 1.6l-1.1 1.3a1 1 0 00.8 1.7h10a1 1 0 00.8-1.7l-1.1-1.3a2.4 2.4 0 01-.6-1.6V9a4 4 0 00-4-4z" />
    <path d="M10 18a2 2 0 004 0" />
  </svg>
);
