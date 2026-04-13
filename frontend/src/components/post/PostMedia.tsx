import React, { useState } from 'react';

interface MediaItem {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  orderIndex: number;
}

interface PostMediaProps {
  media: MediaItem[];
}

export const PostMedia: React.FC<PostMediaProps> = ({ media }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sortedMedia = [...media].sort((a, b) => a.orderIndex - b.orderIndex);
  const currentItem = sortedMedia[currentIndex] ?? sortedMedia[0];

  if (sortedMedia.length === 0 || !currentItem) return null;

  return (
    <div className="relative border-y border-[var(--app-border)] bg-black">
      <div className="relative aspect-square">
        {currentItem.type === 'IMAGE' ? (
          <img src={currentItem.url} alt="" className="h-full w-full object-contain" />
        ) : (
          <video src={currentItem.url} controls className="h-full w-full object-contain" />
        )}

        {sortedMedia.length > 1 ? (
          <>
            {currentIndex > 0 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-sm font-semibold text-[var(--app-text)] shadow-sm transition hover:bg-white"
              >
                {'<'}
              </button>
            ) : null}

            {currentIndex < sortedMedia.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-sm font-semibold text-[var(--app-text)] shadow-sm transition hover:bg-white"
              >
                {'>'}
              </button>
            ) : null}

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {sortedMedia.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                    index === currentIndex ? 'w-3 bg-white' : 'bg-white/45'
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
