import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DotsThree, Heart, PencilSimple, Trash, WarningCircle } from '@phosphor-icons/react';
import { Comment } from '../types';
import { Avatar } from './common/Avatar';
import { CommentContent } from './common/CommentContent';
import { ConfirmDialog } from './common/ConfirmDialog';
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
  highlightCommentId?: string;
  expandParentId?: string;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onDeleted,
  onReport,
  depth = 0,
  onReplyClick,
  onNavigate,
  postId,
  highlightCommentId,
  expandParentId,
}) => {
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localContent, setLocalContent] = useState(comment.content);
  const [isFollowing, setIsFollowing] = useState(!!comment.user?.isFollowing);
  const [liked, setLiked] = useState(!!comment.liked);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [localRepliesCount, setLocalRepliesCount] = useState(comment.repliesCount || 0);

  const loadReplies = React.useCallback(async () => {
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
      toast.error('KhÃ´ng thá»ƒ táº£i pháº£n há»“i.');
    } finally {
      setIsLoadingReplies(false);
    }
  }, [comment.id, showReplies]);

  React.useEffect(() => {
    if (expandParentId === comment.id && localRepliesCount > 0 && !showReplies && !isLoadingReplies) {
      void loadReplies();
    }
  }, [expandParentId, comment.id, localRepliesCount, showReplies, isLoadingReplies, loadReplies]);

  React.useEffect(() => {
    if (highlightCommentId !== comment.id) return;

    let cancelled = false;
    let removeTimer: ReturnType<typeof setTimeout> | undefined;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        const element = document.getElementById(`comment-${comment.id}`);
        if (!element) return;
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        removeTimer = setTimeout(() => {
          if (cancelled) return;
          element.classList.add('comment-highlight');
          window.setTimeout(() => {
            element.classList.remove('comment-highlight');
          }, 5500);
        }, 700);
      });
    });

    return () => {
      cancelled = true;
      if (removeTimer) clearTimeout(removeTimer);
    };
  }, [highlightCommentId, comment.id]);

  React.useEffect(() => {
    if (!comment.replies || comment.replies.length === 0) return;

    setReplies((prev) => {
      const incomingIds = new Set(comment.replies!.map((reply) => reply.id));
      const cleaned = prev.filter((reply) => !reply.id.startsWith('temp-') || incomingIds.has(reply.id));
      const toAdd = comment.replies!.filter((reply) => !cleaned.some((item) => item.id === reply.id));
      if (toAdd.length === 0 && cleaned.length === prev.length) return prev;
      return [...cleaned, ...toAdd];
    });
    if (!showReplies) setShowReplies(true);
    if (localRepliesCount < (comment.repliesCount || 0)) {
      setLocalRepliesCount(comment.repliesCount!);
    }
  }, [comment.replies, comment.repliesCount, showReplies, localRepliesCount]);

  const isOwner = currentUserId === comment.userId;
  const authorLabel = comment.user?.username || comment.user?.name || 'ThÃ nh viÃªn';
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
      toast.error('KhÃ´ng thá»ƒ cáº­p nháº­t lÆ°á»£t thÃ­ch.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      toast.error('BÃ¬nh luáº­n khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.');
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
      toast.success('ÄÃ£ cáº­p nháº­t bÃ¬nh luáº­n.');
    } catch {
      toast.error('KhÃ´ng thá»ƒ sá»­a bÃ¬nh luáº­n.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await engagementService.deleteComment(comment.id);
      toast.success('ÄÃ£ xÃ³a bÃ¬nh luáº­n.');
      onDeleted(comment.id);
    } catch {
      toast.error('KhÃ´ng thá»ƒ xÃ³a bÃ¬nh luáº­n.');
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
        toast.success(`ÄÃ£ bá» theo dÃµi ${authorLabel}`);
      } else {
        await userService.followUser(comment.user.id);
        toast.success(`ÄÃ£ theo dÃµi ${authorLabel}`);
      }
    } catch {
      setIsFollowing(previouslyFollowing);
      toast.error('CÃ³ lá»—i xáº£y ra, vui lÃ²ng thá»­ láº¡i.');
    }
  };

  const handleReplyDeleted = (replyId: string) => {
    setReplies((prev) => prev.filter((reply) => reply.id !== replyId));
    setLocalRepliesCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <div>
      <div
        id={`comment-${comment.id}`}
        className="group relative flex cursor-pointer items-start gap-3 rounded-lg p-2 spring-ease hover:bg-[var(--app-bg-soft)]"
      >
        <Link
          to={profileLink}
          onClick={handleNavigateClick}
          className="shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
        >
          <Avatar
            src={comment.user?.avatarUrl}
            name={comment.user?.name}
            username={comment.user?.username}
            size="sm"
          />
        </Link>

        <div className="min-w-0 flex-1 text-sm leading-6 text-[var(--app-text)]">
          <Link
            to={profileLink}
            onClick={handleNavigateClick}
            className="mr-2 rounded-sm font-semibold text-[var(--app-text)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
          >
            {authorLabel}
          </Link>

          {isEditing ? (
            <div className="mt-1">
              <textarea
                autoFocus
                className="w-full rounded-md border border-[var(--app-border)] bg-transparent p-2 text-sm text-[var(--app-text)] focus:border-[var(--app-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                rows={2}
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
                disabled={isSavingEdit || isDeleting}
                name="comment-edit"
                spellCheck={false}
              />
              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                  onClick={() => setIsEditing(false)}
                  disabled={isSavingEdit || isDeleting}
                >
                  Há»§y
                </button>
                <button
                  type="button"
                  className="rounded-md bg-[var(--app-primary)] px-2 py-1 text-xs font-semibold text-white hover:bg-[var(--app-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)] disabled:opacity-50"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || isDeleting}
                >
                  {isSavingEdit ? 'Äang lÆ°uâ€¦' : 'LÆ°u láº¡i'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <span className="whitespace-pre-wrap">
                {comment.replyToUser ? (
                  <Link
                    to={`/${encodeURIComponent(comment.replyToUser.username || comment.replyToUser.id)}`}
                    onClick={handleNavigateClick}
                    className="mr-1 font-semibold text-[var(--app-primary)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                  >
                    @{comment.replyToUser.username || comment.replyToUser.name}
                  </Link>
                ) : null}
                <CommentContent content={localContent} onNavigate={handleNavigateClick} />
              </span>
              <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-[var(--app-muted)]">
                <span>{formatTimeAgo(comment.createdAt)}</span>
                {likesCount > 0 ? <span>{likesCount} lÆ°á»£t thÃ­ch</span> : null}
                {onReplyClick ? (
                  <button
                    type="button"
                    onClick={() => onReplyClick(comment)}
                    className="spring-ease hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                  >
                    Tráº£ lá»i
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        {!isEditing ? (
          <div className="mt-2 flex shrink-0 flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={handleLikeToggle}
              className={`flex h-9 w-9 items-center justify-center rounded-full spring-ease focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)] ${
                liked ? 'text-[var(--app-danger)]' : 'text-[var(--app-muted)] hover:text-[var(--app-danger)]'
              }`}
              aria-label={liked ? 'Bỏ thích bình luận' : 'Thích bình luận'}
            >
              <Heart size={16} weight={liked ? 'fill' : 'regular'} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {!isEditing ? (
          <div className="relative flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowOptionsDropdown(!showOptionsDropdown);
              }}
              disabled={isDeleting}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--app-muted)] spring-ease hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)] disabled:opacity-50"
              aria-label="Tùy chọn bình luận"
            >
              <DotsThree size={18} weight="bold" aria-hidden="true" />
            </button>

            {showOptionsDropdown ? (
              <>
                <button
                  type="button"
                  aria-label="ÄÃ³ng menu bÃ¬nh luáº­n"
                  className="fixed inset-0 z-[60] cursor-default"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowOptionsDropdown(false);
                  }}
                />
                <div className="absolute right-0 top-full z-[70] mt-1 w-[190px] rounded-xl bg-[var(--app-bg)] py-1 shadow-lg ring-1 ring-[var(--app-border)]">
                  {isOwner ? (
                    <>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setShowOptionsDropdown(false);
                          setIsEditing(true);
                          setEditContent(localContent);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-[var(--app-text)] hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                      >
                        <PencilSimple size={16} aria-hidden="true" />
                        Chá»‰nh sá»­a
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setShowOptionsDropdown(false);
                          setIsDeleteOpen(true);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-[var(--app-danger)] hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                      >
                        <Trash size={16} aria-hidden="true" />
                        XÃ³a
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setShowOptionsDropdown(false);
                          void handleToggleFollow();
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-medium text-[var(--app-text)] hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                      >
                        {isFollowing ? `Bá» theo dÃµi ${authorLabel}` : `Theo dÃµi ${authorLabel}`}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setShowOptionsDropdown(false);
                          onReport(comment.id);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-[var(--app-warning)] hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                      >
                        <WarningCircle size={16} aria-hidden="true" />
                        BÃ¡o cÃ¡o
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {depth === 0 && localRepliesCount > 0 ? (
        <div className="pl-10">
          <button
            type="button"
            onClick={loadReplies}
            disabled={isLoadingReplies}
            className="mb-1 flex items-center gap-2 px-2 py-1 text-xs font-semibold text-[var(--app-muted)] spring-ease hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
          >
            <span className="inline-block w-6 border-t border-[var(--app-muted)]" />
            {isLoadingReplies
              ? 'Äang táº£iâ€¦'
              : showReplies
                ? 'áº¨n pháº£n há»“i'
                : `Xem ${localRepliesCount} pháº£n há»“i`}
          </button>

          {showReplies ? (
            <div className="space-y-0.5">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onDeleted={handleReplyDeleted}
                  onReport={onReport}
                  depth={depth + 1}
                  onReplyClick={onReplyClick}
                  onNavigate={onNavigate}
                  postId={postId}
                  highlightCommentId={highlightCommentId}
                  expandParentId={expandParentId}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={isDeleteOpen}
        title="XÃ³a bÃ¬nh luáº­n?"
        description="BÃ¬nh luáº­n nÃ y sáº½ bá»‹ gá»¡ khá»i bÃ i viáº¿t. HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c."
        confirmLabel="XÃ³a bÃ¬nh luáº­n"
        variant="danger"
        isLoading={isDeleting}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};
