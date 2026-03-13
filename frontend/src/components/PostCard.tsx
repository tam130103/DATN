import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Comment, Post } from '../types';
import { engagementService } from '../services/engagement.service';
import { postService } from '../services/post.service';
import { useAuth } from '../contexts/AuthContext';
import { Avatar } from './common/Avatar';

interface PostCardProps {
  post: Post;
  onDeleted?: (postId: string) => void;
}

const hashtagRegex = /#(\w+)/g;

const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
    <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 000-7.8z" />
  </svg>
);

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

export const PostCard: React.FC<PostCardProps> = ({ post, onDeleted }) => {
  const { user } = useAuth();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [liked, setLiked] = useState(post.liked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const media = useMemo(
    () => [...(post.media || [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [post.media],
  );

  const hashtags = useMemo(() => {
    if (post.postHashtags?.length) {
      return post.postHashtags.map((item) => item.hashtag.name);
    }

    return Array.from(new Set((post.caption.match(hashtagRegex) || []).map((tag) => tag.slice(1).toLowerCase())));
  }, [post.caption, post.postHashtags]);

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

  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }

    setIsLoadingComments(true);
    try {
      const data = await engagementService.getPostComments(post.id);
      setComments(data);
      setShowComments(true);
    } catch {
      toast.error('Failed to load comments.');
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentText.trim()) return;

    try {
      const newComment = await engagementService.createComment(post.id, commentText.trim());
      setComments((prev) => [newComment, ...prev]);
      setShowComments(true);
      setCommentText('');
    } catch {
      toast.error('Failed to add comment.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await postService.deletePost(post.id);
      toast.success('Post deleted.');
      onDeleted?.(post.id);
    } catch {
      toast.error('Failed to delete post.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderCaption = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, index) => {
      if (!part.startsWith('#')) {
        return <span key={`${part}-${index}`}>{part}</span>;
      }

      const tag = part.replace('#', '').toLowerCase();
      return (
        <Link
          key={`${tag}-${index}`}
          to={`/hashtag/${tag}`}
          className="font-medium text-blue-500"
        >
          {part}
        </Link>
      );
    });
  };

  const createdAt = new Date(post.createdAt).toLocaleString();
  const profilePath = post.user?.username ? `/${post.user.username}` : '#';
  const displayName = post.user?.username || post.user?.name || 'Member';
  const isOwner = user?.id === post.userId;

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <Link to={profilePath} className="flex items-center gap-3">
          <Avatar src={post.user?.avatarUrl} name={post.user?.name} username={post.user?.username} size="sm" />
          <div>
            <p className="text-sm font-semibold text-neutral-900">{displayName}</p>
            <p className="text-xs text-neutral-500">{createdAt}</p>
          </div>
        </Link>
        {isOwner ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs font-semibold text-neutral-500 transition hover:text-neutral-900 disabled:opacity-60"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        ) : null}
      </div>

      {media.length > 0 ? (
        <div className="border-y border-neutral-200 bg-black">
          <div className="relative aspect-[4/5] max-h-[720px]">
            {media[currentMediaIndex].type === 'IMAGE' ? (
              <img src={media[currentMediaIndex].url} alt={`Post media ${currentMediaIndex + 1}`} className="h-full w-full object-contain" />
            ) : (
              <video src={media[currentMediaIndex].url} controls className="h-full w-full object-contain" />
            )}

            {media.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentMediaIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentMediaIndex === 0}
                  className="absolute left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-800 shadow-sm transition hover:bg-white disabled:opacity-40"
                  aria-label="Previous media"
                >
                  {'<'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMediaIndex((prev) => Math.min(media.length - 1, prev + 1))}
                  disabled={currentMediaIndex === media.length - 1}
                  className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-800 shadow-sm transition hover:bg-white disabled:opacity-40"
                  aria-label="Next media"
                >
                  {'>'}
                </button>
                <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
                  {media.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrentMediaIndex(index)}
                      className={`h-2 w-2 rounded-full ${index === currentMediaIndex ? 'bg-white' : 'bg-white/40'}`}
                      aria-label={`Go to media ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleLikeToggle}
            className={liked ? 'text-rose-500' : 'text-neutral-700'}
            aria-label="Like"
          >
            <HeartIcon filled={liked} />
          </button>
          <button
            type="button"
            onClick={loadComments}
            disabled={isLoadingComments}
            className="text-neutral-700"
            aria-label="Comments"
          >
            <CommentIcon />
          </button>
          <span className="ml-auto text-xs text-neutral-500">{createdAt}</span>
        </div>

        <p className="text-sm font-semibold text-neutral-900">{likesCount} likes</p>

        <div className="text-sm text-neutral-800">
          <span className="font-semibold text-neutral-900">{displayName}</span>{' '}
          {renderCaption(post.caption)}
        </div>

        {hashtags.length > 0 ? (
          <div className="flex flex-wrap gap-2 text-xs text-blue-500">
            {hashtags.map((tag) => (
              <Link key={tag} to={`/hashtag/${tag}`} className="font-medium">
                #{tag}
              </Link>
            ))}
          </div>
        ) : null}

        {showComments ? (
          <div className="space-y-3">
            <form onSubmit={handleSubmitComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Add a comment..."
                className="flex-1 rounded-full border border-neutral-200 px-4 py-2 text-sm outline-none focus:border-neutral-400"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="text-sm font-semibold text-blue-500 disabled:opacity-50"
              >
                Post
              </button>
            </form>

            {comments.length === 0 ? (
              <p className="text-xs text-neutral-500">No comments yet.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2">
                  <Avatar src={comment.user?.avatarUrl} name={comment.user?.name} username={comment.user?.username} size="sm" />
                  <p className="text-sm text-neutral-800">
                    <span className="font-semibold text-neutral-900">
                      {comment.user?.username ? `@${comment.user.username}` : comment.user?.name || 'Member'}
                    </span>{' '}
                    {comment.content}
                  </p>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
};

