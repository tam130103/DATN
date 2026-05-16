import React from 'react';
import { motion } from 'framer-motion';
import { BookmarkSimple, ChatCircle, Heart, PaperPlaneTilt } from '@phosphor-icons/react';

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
        <div className="flex items-center">
          <motion.button
            type="button"
            onClick={onLikeToggle}
            whileTap={{ scale: 1.3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
            aria-label={liked ? 'Bỏ thích bài viết' : 'Thích bài viết'}
          >
            <Heart size={24} weight={liked ? 'fill' : 'regular'} className={liked ? 'text-[var(--app-accent)]' : ''} aria-hidden="true" />
          </motion.button>
          {likesCount > 0 && (
            <span className="ml-0.5 text-[14px] font-semibold tabular-nums text-[var(--app-text)]">
              {likesCount.toLocaleString('vi-VN')}
            </span>
          )}
        </div>

        <div className="ml-2 flex items-center">
          <button
            type="button"
            onClick={onCommentToggle}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
            aria-label="Mở bình luận"
          >
            <ChatCircle size={24} aria-hidden="true" />
          </button>
          {commentsCount > 0 && (
            <span className="ml-0.5 text-[14px] font-semibold tabular-nums text-[var(--app-text)]">
              {commentsCount.toLocaleString('vi-VN')}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onShare}
          className="ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
          aria-label="Chia sẻ bài viết"
        >
          <PaperPlaneTilt size={24} aria-hidden="true" />
        </button>
      </div>

      <motion.button
        type="button"
        onClick={onSaveToggle}
        whileTap={{ scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
        aria-label={saved ? 'Gỡ khỏi mục đã lưu' : 'Lưu bài viết'}
      >
        <BookmarkSimple size={24} weight={saved ? 'fill' : 'regular'} aria-hidden="true" />
      </motion.button>
    </div>
  );
};
