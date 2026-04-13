import React from 'react';

interface PostActionsProps {
  liked: boolean;
  likesCount: number;
  onLikeToggle: () => void;
  saved: boolean;
  onSaveToggle: () => void;
  onCommentToggle: () => void;
  commentsCount: number;
  onShare: () => void;
}

const HeartIcon = ({ filled }: { filled?: boolean }) =>
  filled ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--app-accent)]" fill="currentColor">
      <path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-1.834-1.527-4.303-3.752C5.152 14.08 2.5 12.194 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-1.834-1.527-4.303-3.752C5.152 14.08 2.5 12.194 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z" />
    </svg>
  );

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M20.656 17.008a9.993 9.993 0 10-3.59 3.615L22 22z" strokeLinejoin="round" />
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
    <line x1="22" y1="3" x2="9.218" y2="10.083" />
    <polygon points="22 3 15 22 11 13 2 9" />
  </svg>
);

const BookmarkIcon = ({ filled }: { filled?: boolean }) =>
  filled ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--app-text)]" fill="currentColor">
      <path d="M20 21l-8-7.56L4 21V3h16v18z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M20 21l-8-7.56L4 21V3h16v18z" />
    </svg>
  );

export const PostActions: React.FC<PostActionsProps> = ({
  liked,
  likesCount,
  onLikeToggle,
  saved,
  onSaveToggle,
  onCommentToggle,
  commentsCount,
  onShare,
}) => {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-1">
        {/* Like */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={onLikeToggle}
            className="interactive-icon inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--app-bg-soft)]"
            title="Thích"
          >
            <HeartIcon filled={liked} />
          </button>
          {likesCount > 0 && (
            <span className="ml-0.5 text-[14px] font-semibold text-[var(--app-text)]">
              {likesCount.toLocaleString()}
            </span>
          )}
        </div>

        {/* Comment */}
        <div className="flex items-center ml-2">
          <button
            type="button"
            onClick={onCommentToggle}
            className="interactive-icon inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--app-bg-soft)]"
            title="Bình luận"
          >
            <CommentIcon />
          </button>
          {commentsCount > 0 && (
            <span className="ml-0.5 text-[14px] font-semibold text-[var(--app-text)]">
              {commentsCount.toLocaleString()}
            </span>
          )}
        </div>

        {/* Share */}
        <button
          type="button"
          onClick={onShare}
          className="interactive-icon inline-flex h-9 w-9 items-center justify-center rounded-full ml-2 transition hover:bg-[var(--app-bg-soft)]"
          title="Chia sẻ"
        >
          <ShareIcon />
        </button>
      </div>

      <button
        type="button"
        onClick={onSaveToggle}
        className="interactive-icon inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--app-bg-soft)] active:scale-90"
        title={saved ? 'Gỡ khỏi mục đã lưu' : 'Lưu bài viết'}
      >
        <BookmarkIcon filled={saved} />
      </button>
    </div>
  );
};
