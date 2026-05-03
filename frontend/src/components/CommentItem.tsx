import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Comment } from '../types';
import { Avatar } from './common/Avatar';
import { CommentContent } from './common/CommentContent';
import { engagementService } from '../services/engagement.service';
import { userService } from '../services/user.service';
import { formatTimeAgo } from '../utils/formatTime';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  onDeleted: (commentId: string) => void;
  onReport: (commentId: string) => void;
  depth?: number;
  onReplyClick?: (comment: Comment) => void;
  onNavigate?: () => void;
  postId?: string;
}

const DotsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </svg>
);

const HeartSmallIcon = ({ filled, className }: { filled?: boolean; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 000-7.8z" />
  </svg>
);

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onDeleted,
  onReport,
  depth = 0,
  onReplyClick,
  onNavigate,
  postId,
}) => {
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localContent, setLocalContent] = useState(comment.content);
  const [isFollowing, setIsFollowing] = useState(!!comment.user?.isFollowing);

  // Like state
  const [liked, setLiked] = useState(!!comment.liked);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);

  // Replies state
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [localRepliesCount, setLocalRepliesCount] = useState(comment.repliesCount || 0);

  React.useEffect(() => {
    if (comment.replies && comment.replies.length > 0) {
      setReplies((prev) => {
        const incomingIds = new Set(comment.replies!.map((r) => r.id));
        // Remove stale optimistic (temp-) entries that were replaced by real ones
        const cleaned = prev.filter((p) => !p.id.startsWith('temp-') || incomingIds.has(p.id));
        // Add only truly new entries
        const toAdd = comment.replies!.filter((r) => !cleaned.some((p) => p.id === r.id));
        if (toAdd.length === 0 && cleaned.length === prev.length) return prev;
        return [...cleaned, ...toAdd];
      });
      if (!showReplies) setShowReplies(true);
      if (localRepliesCount < (comment.repliesCount || 0)) {
        setLocalRepliesCount(comment.repliesCount!);
      }
    }
  }, [comment.replies, comment.repliesCount, showReplies, localRepliesCount]);

  const isOwner = currentUserId === comment.userId;
  const authorLabel = comment.user?.username || comment.user?.name || 'Thành viên';
  const profileLink = `/${comment.user?.username || comment.user?.id}`;

  const handleNavigateClick = () => {
    onNavigate?.();
  };

  const handleLikeToggle = async () => {
    const prevLiked = liked;
    const prevCount = likesCount;
    setLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const result = prevLiked
        ? await engagementService.unlikeComment(comment.id)
        : await engagementService.likeComment(comment.id);
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch {
      setLiked(prevLiked);
      setLikesCount(prevCount);
      toast.error('Không thể cập nhật lượt thích.');
    }
  };

  const handleLoadReplies = async () => {
    if (showReplies) {
      setShowReplies(false);
      return;
    }
    setIsLoadingReplies(true);
    try {
      const data = await engagementService.getCommentReplies(comment.id);
      setReplies(data);
      setShowReplies(true);
    } catch {
      toast.error('Không thể tải phản hồi.');
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      toast.error('Bình luận không được để trống.');
      return;
    }
    if (editContent.trim() === localContent) {
      setIsEditing(false);
      return;
    }

    setIsSavingEdit(true);
    try {
      const updated = await engagementService.updateComment(comment.id, editContent);
      setLocalContent(updated.content);
      setIsEditing(false);
      toast.success('Đã cập nhật bình luận.');
    } catch {
      toast.error('Không thể sửa bình luận.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Xóa bình luận này?')) return;

    setIsDeleting(true);
    try {
      await engagementService.deleteComment(comment.id);
      toast.success('Đã xóa bình luận.');
      onDeleted(comment.id);
    } catch {
      toast.error('Không thể xóa bình luận.');
      setIsDeleting(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!comment.user?.id) return;
    const previouslyFollowing = isFollowing;
    setIsFollowing(!previouslyFollowing);

    try {
      if (previouslyFollowing) {
        await userService.unfollowUser(comment.user.id);
        toast.success(`Đã bỏ theo dõi ${authorLabel}`);
      } else {
        await userService.followUser(comment.user.id);
        toast.success(`Đã theo dõi ${authorLabel}`);
      }
    } catch {
      setIsFollowing(previouslyFollowing);
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const handleReplyDeleted = (replyId: string) => {
    setReplies(prev => prev.filter(r => r.id !== replyId));
    setLocalRepliesCount(prev => Math.max(0, prev - 1));
  };

  return (
    <div>
      <div id={`comment-${comment.id}`} className="group relative flex items-start gap-3 rounded-lg p-2 transition hover:bg-[var(--app-bg-soft)]">
        {/* Avatar with profile link */}
        <Link to={profileLink} onClick={handleNavigateClick} className="shrink-0">
          <Avatar
            src={comment.user?.avatarUrl}
            name={comment.user?.name}
            username={comment.user?.username}
            size="sm"
          />
        </Link>
        
        <div className="min-w-0 flex-1 text-sm leading-6 text-[var(--app-text)]">
          <Link to={profileLink} onClick={handleNavigateClick} className="mr-2 font-semibold text-[var(--app-text)] hover:underline">
            {authorLabel}
          </Link>
          
          {isEditing ? (
            <div className="mt-1">
              <textarea
                autoFocus
                className="w-full rounded-md border border-[var(--app-border)] bg-transparent p-2 text-sm text-[var(--app-text)] focus:border-[var(--app-primary)] focus:outline-none"
                rows={2}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                disabled={isSavingEdit || isDeleting}
              />
              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]"
                  onClick={() => setIsEditing(false)}
                  disabled={isSavingEdit || isDeleting}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="rounded-md bg-[var(--app-primary)] px-2 py-1 text-xs font-semibold text-white hover:bg-[var(--app-primary-strong)] disabled:opacity-50"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || isDeleting}
                >
                  {isSavingEdit ? 'Đang lưu...' : 'Lưu lại'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <CommentContent content={localContent} onNavigate={handleNavigateClick} />
              {/* Action buttons row */}
              <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-[var(--app-muted)]">
                <span>{formatTimeAgo(comment.createdAt)}</span>
                {likesCount > 0 && (
                  <span>{likesCount} lượt thích</span>
                )}
                {onReplyClick && (
                  <button
                    type="button"
                    onClick={() => onReplyClick(comment)}
                    className="hover:text-[var(--app-text)] transition"
                  >
                    Trả lời
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Like button - always visible */}
        {!isEditing && (
          <div className="flex shrink-0 flex-col items-center gap-0.5 mt-2">
            <button
              type="button"
              onClick={handleLikeToggle}
              className={`rounded-full p-1 transition ${liked ? 'text-rose-500' : 'text-[var(--app-muted)] hover:text-rose-400'}`}
              aria-label={liked ? 'Bỏ thích bình luận' : 'Thích bình luận'}
            >
              <HeartSmallIcon filled={liked} className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Options dropdown */}
        {!isEditing && (
          <div className="relative flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowOptionsDropdown(!showOptionsDropdown);
              }}
              disabled={isDeleting}
              className="rounded-full p-1 text-[var(--app-muted)] transition hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] disabled:opacity-50"
              aria-label="Tùy chọn bình luận"
            >
              <DotsIcon className="h-4 w-4" />
            </button>

            {showOptionsDropdown && (
              <>
                <div
                  className="fixed inset-0 z-[60]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOptionsDropdown(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 z-[70] w-[180px] rounded-xl bg-[var(--app-bg)] py-1 shadow-lg ring-1 ring-[var(--app-border)]">
                  {isOwner ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOptionsDropdown(false);
                          setIsEditing(true);
                          setEditContent(localContent);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-medium text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]"
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOptionsDropdown(false);
                          handleDelete();
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-medium text-red-500 hover:bg-[var(--app-bg-soft)]"
                      >
                        Xóa
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOptionsDropdown(false);
                          handleToggleFollow();
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-medium text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]"
                      >
                        {isFollowing ? `Bỏ theo dõi ${authorLabel}` : `Theo dõi ${authorLabel}`}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOptionsDropdown(false);
                          onReport(comment.id);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-medium text-orange-500 hover:bg-[var(--app-bg-soft)]"
                      >
                        Báo cáo
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Replies section - only for root comments (depth === 0) */}
      {depth === 0 && localRepliesCount > 0 && (
        <div className="pl-10">
          <button
            type="button"
            onClick={handleLoadReplies}
            disabled={isLoadingReplies}
            className="mb-1 flex items-center gap-2 px-2 py-1 text-xs font-semibold text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            <span className="inline-block w-6 border-t border-[var(--app-muted)]" />
            {isLoadingReplies
              ? 'Đang tải...'
              : showReplies
                ? 'Ẩn phản hồi'
                : `Xem ${localRepliesCount} phản hồi`}
          </button>

          {showReplies && (
            <div className="space-y-0.5">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onDeleted={handleReplyDeleted}
                  onReport={onReport}
                  depth={1}
                  onReplyClick={onReplyClick}
                  onNavigate={onNavigate}
                  postId={postId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
