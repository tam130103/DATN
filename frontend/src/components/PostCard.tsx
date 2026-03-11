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
          className="font-medium text-cyan-700 transition hover:text-cyan-900"
        >
          {part}
        </Link>
      );
    });
  };

  const createdAt = new Date(post.createdAt).toLocaleString();
  const profilePath = post.user?.username ? `/${post.user.username}` : '#';
  const isOwner = user?.id === post.userId;

  return (
    <article className="overflow-hidden rounded-[32px] border border-white/70 bg-white/88 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={post.user?.avatarUrl} name={post.user?.name} username={post.user?.username} size="lg" />
          <div className="min-w-0">
            {post.user?.username ? (
              <Link to={profilePath} className="font-semibold text-slate-900 transition hover:text-slate-700">
                @{post.user.username}
              </Link>
            ) : (
              <p className="font-semibold text-slate-900">{post.user?.name || 'Unknown author'}</p>
            )}
            <p className="truncate text-sm text-slate-500">{post.user?.name || 'Community member'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{createdAt}</p>
          {isOwner ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 transition hover:border-rose-200 hover:bg-rose-100 disabled:opacity-60"
            >
              {isDeleting ? '...' : 'Delete'}
            </button>
          ) : null}
        </div>
      </div>

      {media.length > 0 ? (
        <div className="border-b border-slate-100 bg-slate-950">
          <div className="relative aspect-[4/5] max-h-[640px]">
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
                  className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-lg font-semibold text-slate-900 shadow-lg transition hover:bg-white disabled:opacity-35"
                >
                  {'<'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMediaIndex((prev) => Math.min(media.length - 1, prev + 1))}
                  disabled={currentMediaIndex === media.length - 1}
                  className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-lg font-semibold text-slate-900 shadow-lg transition hover:bg-white disabled:opacity-35"
                >
                  {'>'}
                </button>
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/35 px-3 py-2 backdrop-blur">
                  {media.map((item, index) => (
                    <span
                      key={item.id}
                      className={`h-2.5 w-2.5 rounded-full ${index === currentMediaIndex ? 'bg-white' : 'bg-white/35'}`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-5 px-5 py-5 lg:px-6 lg:py-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleLikeToggle}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              liked
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {liked ? 'Liked' : 'Like'} · {likesCount}
          </button>
          <button
            type="button"
            onClick={loadComments}
            disabled={isLoadingComments}
            className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
          >
            {isLoadingComments ? 'Loading...' : showComments ? 'Hide comments' : 'Comments'}
          </button>
          {hashtags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {hashtags.map((tag) => (
                <Link
                  key={tag}
                  to={`/hashtag/${tag}`}
                  className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 transition hover:bg-cyan-100"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-sm leading-7 text-slate-700">{renderCaption(post.caption)}</p>
        </div>

        {showComments ? (
          <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-4">
            <form onSubmit={handleSubmitComment} className="flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Add a thoughtful reply..."
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Send
              </button>
            </form>

            <div className="mt-4 space-y-3">
              {comments.length === 0 ? (
                <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">No comments yet.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <Avatar src={comment.user?.avatarUrl} name={comment.user?.name} username={comment.user?.username} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700">
                          <span className="font-semibold text-slate-900">
                            {comment.user?.username ? `@${comment.user.username}` : comment.user?.name || 'Member'}
                          </span>{' '}
                          {comment.content}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{new Date(comment.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
};
