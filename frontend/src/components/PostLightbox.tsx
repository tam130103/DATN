import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Comment, Post } from '../types';
import { Avatar } from './common/Avatar';
import { engagementService } from '../services/engagement.service';

const CloseIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M6 6l12 12M18 6l-12 12" />
  </svg>
);

const HeartIcon = ({ filled, className }: { filled?: boolean; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
    <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 000-7.8z" />
  </svg>
);

const CommentIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const ChevronIcon = ({ direction, className }: { direction: 'left' | 'right'; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    {direction === 'left' ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
  </svg>
);

const DotsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </svg>
);

interface PostLightboxProps {
  post: Post;
  onClose: () => void;
}

export const PostLightbox: React.FC<PostLightboxProps> = ({ post, onClose }) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [liked, setLiked] = useState(post.liked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const media = useMemo(
    () => [...(post.media || [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [post.media],
  );

  useEffect(() => {
    let isActive = true;

    const loadComments = async () => {
      setIsLoadingComments(true);
      try {
        const data = await engagementService.getPostComments(post.id);
        if (isActive) {
          setComments(data);
        }
      } catch {
        if (isActive) {
          toast.error('Failed to load comments.');
        }
      } finally {
        if (isActive) {
          setIsLoadingComments(false);
        }
      }
    };

    loadComments();

    return () => {
      isActive = false;
    };
  }, [post.id]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleLikeToggle = async () => {
    const originalLiked = liked;
    const originalCount = likesCount;
    const nextLiked = !originalLiked;

    setLiked(nextLiked);
    setLikesCount(nextLiked ? originalCount + 1 : Math.max(0, originalCount - 1));

    try {
      const result = await engagementService.toggleLike(post.id);
      setLiked(result.liked);
      setLikesCount(result.liked ? originalCount + 1 : Math.max(0, originalCount - 1));
    } catch {
      setLiked(originalLiked);
      setLikesCount(originalCount);
      toast.error('Failed to update like.');
    }
  };

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newComment = await engagementService.createComment(post.id, commentText.trim());
      setComments((prev) => [newComment, ...prev]);
      setCommentText('');
    } catch {
      toast.error('Failed to add comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const createdAt = new Date(post.createdAt).toLocaleDateString();
  const cover = media[currentMediaIndex];
  const isVideo = cover?.type === 'VIDEO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-6" onClick={handleBackdropClick}>
      <div className="relative flex h-[90vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:h-[80vh] md:max-h-[820px] md:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80"
          aria-label="Close"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="relative flex w-full items-center justify-center bg-black md:flex-1">
          {cover ? (
            isVideo ? (
              <video
                src={cover.url}
                controls
                className="h-auto max-h-[60vh] w-full object-contain md:h-full md:max-h-full"
              />
            ) : (
              <img
                src={cover.url}
                alt={post.caption || 'Post media'}
                className="h-auto max-h-[60vh] w-full object-contain md:h-full md:max-h-full"
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/70">No media available</div>
          )}

          {media.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setCurrentMediaIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentMediaIndex === 0}
                className="absolute left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-40"
                aria-label="Previous media"
              >
                <ChevronIcon direction="left" className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMediaIndex((prev) => Math.min(media.length - 1, prev + 1))}
                disabled={currentMediaIndex === media.length - 1}
                className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-40"
                aria-label="Next media"
              >
                <ChevronIcon direction="right" className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>

        <div className="flex w-full flex-col bg-white text-neutral-900 md:w-[420px] md:border-l md:border-neutral-200">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar src={post.user?.avatarUrl} name={post.user?.name} username={post.user?.username} size="sm" />
              <div className="text-sm font-semibold">{post.user?.username || post.user?.name || 'Member'}</div>
            </div>
            <button type="button" className="text-neutral-400 transition hover:text-neutral-700" aria-label="Post options">
              <DotsIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 text-sm">
            <div className="flex items-start gap-3">
              <Avatar src={post.user?.avatarUrl} name={post.user?.name} username={post.user?.username} size="sm" />
              <p className="text-neutral-800">
                <span className="font-semibold text-neutral-900">
                  {post.user?.username || post.user?.name || 'Member'}
                </span>{' '}
                {post.caption || ''}
              </p>
            </div>

            {isLoadingComments ? (
              <p className="text-xs text-neutral-500">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-neutral-500">No comments yet.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <Avatar src={comment.user?.avatarUrl} name={comment.user?.name} username={comment.user?.username} size="sm" />
                  <p className="text-neutral-800">
                    <span className="font-semibold text-neutral-900">
                      {comment.user?.username || comment.user?.name || 'Member'}
                    </span>{' '}
                    {comment.content}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-neutral-200 px-4 py-3">
            <div className="flex items-center gap-4">
              <button type="button" onClick={handleLikeToggle} className={liked ? 'text-rose-500' : 'text-neutral-700'}>
                <HeartIcon filled={liked} className="h-6 w-6" />
              </button>
              <CommentIcon className="h-6 w-6 text-neutral-700" />
            </div>
            <p className="mt-2 text-sm font-semibold text-neutral-900">{likesCount} likes</p>
            <p className="mt-1 text-xs text-neutral-500">{createdAt}</p>
          </div>

          <form onSubmit={handleSubmitComment} className="flex items-center gap-2 border-t border-neutral-200 px-4 py-3">
            <input
              type="text"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
            />
            <button type="submit" disabled={!commentText.trim() || isSubmitting} className="text-sm font-semibold text-[#0095f6] disabled:opacity-50">
              Post
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
