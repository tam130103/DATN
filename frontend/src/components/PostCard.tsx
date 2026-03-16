import React, { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Comment, Post, User } from '../types';
import { engagementService } from '../services/engagement.service';
import { postService } from '../services/post.service';
import { useAuth } from '../contexts/AuthContext';
import { Avatar } from './common/Avatar';
import { chatService } from '../services/chat.service';
import { userService } from '../services/user.service';

interface PostCardProps {
  post: Post;
  onDeleted?: (postId: string) => void;
}


/* ── Instagram Icons ── */
const HeartIcon = ({ filled }: { filled?: boolean }) =>
  filled ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#ed4956]" fill="currentColor">
      <path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-1.834-1.527-4.303-3.752C5.152 14.08 2.5 12.194 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-1.834-1.527-4.303-3.752C5.152 14.08 2.5 12.194 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z" />
    </svg>
  );

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.656 17.008a9.993 9.993 0 10-3.59 3.615L22 22z" strokeLinejoin="round" />
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="3" x2="9.218" y2="10.083" />
    <polygon points="22 3 15 22 11 13 2 9" />
  </svg>
);

const BookmarkIcon = ({ filled }: { filled?: boolean }) =>
  filled ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M20 22a.999.999 0 01-.687-.273L12 14.815l-7.313 6.912A1 1 0 013 21V3a1 1 0 011-1h16a1 1 0 011 1v18a1 1 0 01-1 1z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21l-8-7.56L4 21V3h16v18z" />
    </svg>
  );

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="6" cy="12" r="1.5" />
    <circle cx="18" cy="12" r="1.5" />
  </svg>
);

/* ── Time Formatting ── */
function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'JUST NOW';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

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
  // Share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFollowing, setShareFollowing] = useState<User[]>([]);
  const [shareQuery, setShareQuery] = useState('');
  const [selectedShareUsers, setSelectedShareUsers] = useState<Set<string>>(new Set());
  const [isSendingShare, setIsSendingShare] = useState(false);

  const media = useMemo(
    () => [...(post.media || [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [post.media],
  );

  const handleLikeToggle = async () => {
    const originalLiked = liked;
    const originalCount = likesCount;
    setLiked(!originalLiked);
    setLikesCount(!originalLiked ? originalCount + 1 : Math.max(0, originalCount - 1));

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
    if (showComments) { setShowComments(false); return; }
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
    const content = commentText.trim();
    setCommentText('');
    // Optimistic update with full user object so name shows immediately
    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      content,
      postId: post.id,
      userId: user?.id || '',
      user: user ?? undefined,
      createdAt: new Date().toISOString(),
    } as any;
    setComments((prev) => [optimisticComment, ...prev]);
    setShowComments(true);
    try {
      const newComment = await engagementService.createComment(post.id, content);
      // Replace optimistic comment with the server response (but keep user if missing)
      setComments((prev) =>
        prev.map((c) =>
          c.id === optimisticComment.id
            ? { ...newComment, user: newComment.user ?? optimisticComment.user }
            : c,
        ),
      );
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
      toast.error('Failed to add comment.');
    }
  };

  const handleShare = useCallback(async () => {
    setShowShareModal(true);
    if (shareFollowing.length === 0 && user?.id) {
      try {
        const list = await userService.getFollowing(user.id, 1, 50);
        setShareFollowing(list);
      } catch {
        toast.error('Could not load following list.');
      }
    }
  }, [shareFollowing.length, user?.id]);

  // Client-side filter by search query
  const filteredShareUsers = useMemo(() =>
    shareFollowing.filter((u) =>
      !shareQuery.trim() ||
      (u.username || '').toLowerCase().includes(shareQuery.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(shareQuery.toLowerCase())
    ), [shareFollowing, shareQuery]);

  const toggleShareUser = (id: string) => {
    setSelectedShareUsers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSendShare = async () => {
    if (selectedShareUsers.size === 0) return;
    const postUrl = `${window.location.origin}/posts/${post.id}`;
    const message = `Check out this post: ${postUrl}`;
    setIsSendingShare(true);
    try {
      await Promise.all(
        Array.from(selectedShareUsers).map(async (userId) => {
          const conv = await chatService.createConversation({ participantIds: [userId] });
          await chatService.sendMessage(conv.id, message);
        })
      );
      toast.success(`Shared to ${selectedShareUsers.size} person${selectedShareUsers.size > 1 ? 's' : ''}!`);
      setShowShareModal(false);
      setSelectedShareUsers(new Set());
      setShareQuery('');
    } catch {
      toast.error('Failed to send. Please try again.');
    } finally {
      setIsSendingShare(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
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
    const parts = text.split(/([#@]\w+)/g);
    const textParts: React.ReactNode[] = [];
    const hashtagParts: React.ReactNode[] = [];

    parts.forEach((part, index) => {
      if (part.startsWith('#')) {
        const tag = part.replace('#', '').toLowerCase();
        hashtagParts.push(
          <Link key={`tag-${index}`} to={`/hashtag/${tag}`} className="mr-1 text-[#00376b] hover:underline">
            {part}
          </Link>
        );
      } else if (part.startsWith('@')) {
        const uname = part.replace('@', '').toLowerCase();
        textParts.push(
          <Link key={`mention-${index}`} to={`/${uname}`} className="font-semibold text-[#00376b] hover:underline">
            {part}
          </Link>
        );
      } else {
        textParts.push(<span key={`text-${index}`}>{part}</span>);
      }
    });

    return (
      <div className="flex flex-col">
        {textParts.length > 0 && (
          <div className="whitespace-pre-wrap">{textParts}</div>
        )}
        {hashtagParts.length > 0 && (
          <div className="mt-0.5 font-bold">
            {hashtagParts}
          </div>
        )}
      </div>
    );
  };

  const profilePath = post.user?.username ? `/${post.user.username}` : '#';
  const displayName = post.user?.username || post.user?.name || 'user';
  const isOwner = user?.id === post.userId;

  return (
    <article className="border-b border-[#dbdbdb] bg-white transition-shadow md:rounded-lg md:border md:shadow-sm md:hover:shadow-md">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <Link to={profilePath} className="flex items-center gap-2.5">
          <Avatar src={post.user?.avatarUrl} name={post.user?.name} username={post.user?.username} size="sm" />
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold">{displayName}</span>
            <span className="text-sm text-[#8e8e8e]">• {timeAgo(post.createdAt)}</span>
          </div>
        </Link>
        {isOwner ? (
          <button onClick={handleDelete} disabled={isDeleting} className="p-1 text-black/70 hover:text-black">
            <MoreIcon />
          </button>
        ) : (
          <button className="p-1 text-black/70"><MoreIcon /></button>
        )}
      </div>

      {/* ── Media ── */}
      {media.length > 0 && (
        <div className="relative bg-black">
          <div className="relative aspect-square max-h-[585px]">
            {media[currentMediaIndex].type === 'IMAGE' ? (
              <img src={media[currentMediaIndex].url} alt="" className="h-full w-full object-contain" />
            ) : (
              <video src={media[currentMediaIndex].url} controls className="h-full w-full object-contain" />
            )}

            {media.length > 1 && (
              <>
                {currentMediaIndex > 0 && (
                  <button
                    onClick={() => setCurrentMediaIndex((p) => p - 1)}
                    className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-sm shadow transition hover:bg-white"
                  >‹</button>
                )}
                {currentMediaIndex < media.length - 1 && (
                  <button
                    onClick={() => setCurrentMediaIndex((p) => p + 1)}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-sm shadow transition hover:bg-white"
                  >›</button>
                )}
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1">
                  {media.map((_, i) => (
                    <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === currentMediaIndex ? 'bg-[#0095f6]' : 'bg-white/50'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Caption ABOVE action bar (text-only posts) ── */}
      {media.length === 0 && (
        <div className="px-3 pt-2 text-sm">
          {renderCaption(post.caption)}
        </div>
      )}

      {/* ── Action Bar ── */}
      <div className="px-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Like button + count */}
            <button
              onClick={handleLikeToggle}
              className="flex items-center gap-1.5 transition-transform active:scale-125"
            >
              <HeartIcon filled={liked} />
              {likesCount > 0 && (
                <span className="text-sm font-semibold">{likesCount.toLocaleString()}</span>
              )}
            </button>
            {/* Comment button + count */}
            <button
              onClick={loadComments}
              disabled={isLoadingComments}
              className="flex items-center gap-1.5"
            >
              <CommentIcon />
              {post.commentsCount != null && post.commentsCount > 0 && (
                <span className="text-sm text-[#8e8e8e]">{post.commentsCount}</span>
              )}
            </button>
            <button onClick={handleShare} className="p-1 transition-transform active:scale-110">
              <ShareIcon />
            </button>
          </div>
          <button className="p-1">
            <BookmarkIcon />
          </button>
        </div>

        {/* ── Caption BELOW action bar (posts with media) ── */}
        {media.length > 0 && (
          <div className="mt-2 text-sm">
            {renderCaption(post.caption)}
          </div>
        )}

        {/* ── View Comments ── */}
        {!showComments && (post.commentsCount ?? 0) > 0 && (
          <button onClick={loadComments} className="mt-1 text-sm text-[#8e8e8e]">
            View all {post.commentsCount} comments
          </button>
        )}
        {!showComments && !post.commentsCount && (
          <button onClick={loadComments} className="mt-1 text-sm text-[#8e8e8e]">
            View comments
          </button>
        )}

        {/* ── Comments ── */}
        {showComments && (
          <div className="mt-2 space-y-1.5">
            {comments.length === 0 ? (
              <p className="text-sm text-[#8e8e8e]">No comments yet.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="text-sm">
                  <span className="mr-1 font-semibold">
                    {comment.user?.username || comment.user?.name || user?.username || 'user'}
                  </span>
                  {comment.content}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Add Comment ── */}
        <form onSubmit={handleSubmitComment} className="mt-2 flex items-center border-t border-[#efefef] py-1.5">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-transparent py-1 text-sm outline-none"
          />
          {commentText.trim() && (
            <button type="submit" className="text-sm font-semibold text-[#0095f6] hover:text-[#00376b]">
              Post
            </button>
          )}
        </form>
      </div>

      {/* ── Share Modal ── */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowShareModal(false);
              setSelectedShareUsers(new Set());
              setShareQuery('');
            }
          }}
        >
          <div className="flex w-full max-w-sm flex-col rounded-xl bg-white shadow-2xl" style={{ maxHeight: '80vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#dbdbdb] px-4 py-3">
              <span className="text-base font-semibold">Share</span>
              <button
                onClick={() => { setShowShareModal(false); setSelectedShareUsers(new Set()); setShareQuery(''); }}
                className="text-2xl leading-none text-[#8e8e8e] hover:text-black"
              >×</button>
            </div>

            {/* Search */}
            <div className="border-b border-[#dbdbdb] px-3 py-2">
              <div className="flex items-center gap-2 rounded-lg bg-[#efefef] px-3 py-2">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#8e8e8e]" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  autoFocus
                  value={shareQuery}
                  onChange={(e) => setShareQuery(e.target.value)}
                  placeholder="Search..."
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto">
              {filteredShareUsers.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[#8e8e8e]">
                  {shareFollowing.length === 0 ? 'Loading...' : 'No users found'}
                </p>
              ) : (
                filteredShareUsers.map((u) => {
                  const isSelected = selectedShareUsers.has(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleShareUser(u.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 hover:bg-[#fafafa]"
                    >
                      <Avatar src={u.avatarUrl} name={u.name} username={u.username} size="sm" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold">{u.username || u.name}</p>
                        {u.name && u.username && <p className="text-xs text-[#8e8e8e]">{u.name}</p>}
                      </div>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                        isSelected ? 'border-[#0095f6] bg-[#0095f6]' : 'border-[#dbdbdb]'
                      }`}>
                        {isSelected && (
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Send Button */}
            <div className="border-t border-[#dbdbdb] px-4 py-3">
              <button
                onClick={handleSendShare}
                disabled={selectedShareUsers.size === 0 || isSendingShare}
                className="w-full rounded-lg bg-[#0095f6] py-2 text-sm font-semibold text-white transition hover:bg-[#1877f2] disabled:opacity-40"
              >
                {isSendingShare ? 'Sending...' : `Send${selectedShareUsers.size > 0 ? ` (${selectedShareUsers.size})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
