import React from 'react';

interface PageSkeletonProps {
  type?: 'profile' | 'post-detail' | 'feed' | 'list' | 'messages';
}

const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton rounded-lg ${className}`} />
);

const SkeletonAvatar: React.FC<{ size?: string }> = ({ size = 'h-12 w-12' }) => (
  <div className={`skeleton ${size} rounded-full flex-shrink-0`} />
);

const SkeletonText: React.FC<{ width?: string }> = ({ width = 'w-full' }) => (
  <div className={`skeleton h-3 ${width}`} />
);

const PostCardSkeleton: React.FC = () => (
  <div className="surface-card rounded-xl p-4 space-y-3">
    <div className="flex items-center gap-3">
      <SkeletonAvatar size="h-10 w-10" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-3 w-32" />
        <SkeletonBlock className="h-2.5 w-20" />
      </div>
    </div>
    <SkeletonBlock className="h-48 w-full" />
    <div className="space-y-2">
      <SkeletonText width="w-3/4" />
      <SkeletonText width="w-1/2" />
    </div>
    <div className="flex gap-4 pt-1">
      <SkeletonBlock className="h-5 w-16" />
      <SkeletonBlock className="h-5 w-16" />
      <SkeletonBlock className="h-5 w-16" />
    </div>
  </div>
);

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ type = 'feed' }) => {
  if (type === 'profile') {
    return (
      <div className="space-y-4">
        <div className="surface-card rounded-xl p-6">
          <div className="flex items-center gap-4">
            <SkeletonAvatar size="h-16 w-16" />
            <div className="flex-1 space-y-3">
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-3 w-56" />
            </div>
          </div>
          <div className="mt-6 flex gap-6">
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-4 w-16" />
          </div>
        </div>
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    );
  }

  if (type === 'post-detail') {
    return (
      <div className="space-y-4">
        <PostCardSkeleton />
        <div className="surface-card rounded-xl p-4 space-y-3">
          <SkeletonBlock className="h-4 w-32" />
          <div className="space-y-3 pl-4 border-l-2 border-[var(--app-border)]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <SkeletonAvatar size="h-8 w-8" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-3 w-28" />
                  <SkeletonText width="w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="surface-card rounded-xl p-4 flex items-center gap-3">
            <SkeletonAvatar size="h-10 w-10" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-3 w-36" />
              <SkeletonText width="w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'messages') {
    return (
      <div className="flex h-full">
        <div className="w-80 border-r border-[var(--app-border)] space-y-1 p-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg p-3">
              <SkeletonAvatar size="h-10 w-10" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-3 w-28" />
                <SkeletonText width="w-3/4" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <SkeletonBlock className="h-14 w-14 rounded-full" />
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-3 w-56" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
};
