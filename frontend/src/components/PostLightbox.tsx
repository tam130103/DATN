import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PushPin } from '@phosphor-icons/react';
import { Comment, Post } from '../types';
import { Avatar } from './common/Avatar';
import { ConfirmDialog } from './common/ConfirmDialog';
import { engagementService } from '../services/engagement.service';
import { postService } from '../services/post.service';
import { userService } from '../services/user.service';
import { useAuth } from '../contexts/AuthContext';
import { PostCaption } from './PostCaption';
import { ReportModal } from './ReportModal';
import { CommentItem } from './CommentItem';
import { getApiMessage } from '../utils/api-error';

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
  onDeleted?: (postId: string) => void;
}



export const PostLightbox: React.FC<PostLightboxProps> = ({ post, onClose, onDeleted }) => {
  const { user } = useAuth();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [liked, setLiked] = useState(post.liked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; type: 'post' | 'comment' } | null>(null);
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const [localCaption, setLocalCaption] = useState(post.caption);
  const [localIsEdited, setLocalIsEdited] = useState(post.isEdited || false);
  const [localIsPinned, setLocalIsPinned] = useState(post.isPinned || false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCaptionText, setEditCaptionText] = useState(post.caption);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    setLocalCaption(post.caption);
    setLocalIsEdited(post.isEdited || false);
    setLocalIsPinned(post.isPinned || false);
    setEditCaptionText(post.caption || '');
  }, [post]);

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
          toast.error('KhÃ´ng thá»ƒ táº£i bÃ¬nh luáº­n.');
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
      setLikesCount(result.likesCount);
    } catch {
      setLiked(originalLiked);
      setLikesCount(originalCount);
      toast.error('KhÃ´ng thá»ƒ cáº­p nháº­t lÆ°á»£t thÃ­ch.');
    }
  };

  const handleTogglePin = async () => {
    try {
      await postService.togglePin(post.id);
      setLocalIsPinned(!localIsPinned);
      toast.success(localIsPinned ? 'ÄÃ£ bá» ghim bÃ i viáº¿t.' : 'ÄÃ£ ghim bÃ i viáº¿t.');
    } catch {
      toast.error('KhÃ´ng thá»ƒ thao tÃ¡c ghim.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editCaptionText?.trim()) {
      toast.error('Ná»™i dung khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.');
      return;
    }
    if (editCaptionText.trim() === localCaption) {
      setIsEditing(false);
      return;
    }

    setIsSavingEdit(true);
    try {
      const updatedPost = await postService.updatePost(post.id, { caption: editCaptionText });
      setLocalCaption(updatedPost.caption);
      setLocalIsEdited(true);
      setIsEditing(false);
      toast.success('ÄÃ£ cáº­p nháº­t bÃ i viáº¿t.');
    } catch (error) {
      toast.error(getApiMessage(error, 'KhÃ´ng thá»ƒ sá»­a bÃ i viáº¿t.'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleReplyClick = (comment: Comment) => {
    setReplyTarget(comment);
    const mentionName = comment.user?.username || (comment.user?.name ? comment.user.name.replace(/\s+/g, '') : '');
    setCommentText(mentionName ? `@${mentionName} ` : '');
    setTimeout(() => commentInputRef.current?.focus(), 0);
  };

  const handleCancelReply = () => {
    setReplyTarget(null);
    setCommentText('');
  };

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentText.trim() || isSubmitting) return;
    if (replyTarget?.id.startsWith('temp-')) {
      toast.error('Vui lÃ²ng Ä‘á»£i bÃ¬nh luáº­n Ä‘Æ°á»£c lÆ°u trÆ°á»›c khi tráº£ lá»i.');
      return;
    }

    const parentId = replyTarget?.id;
    // Backend flattens replies to root, so resolve the root comment ID
    const rootCommentId = replyTarget?.parentId || replyTarget?.id;
    setIsSubmitting(true);
    try {
      const newComment = await engagementService.createComment(
        post.id,
        commentText.trim(),
        parentId,
        replyTarget?.userId,
      );
      if (rootCommentId) {
        // Add reply to the root comment
        setComments((prev) =>
          prev.map((c) =>
            c.id === rootCommentId
              ? {
                  ...c,
                  repliesCount: (c.repliesCount || 0) + 1,
                  replies: [...(c.replies || []), newComment],
                }
              : c,
          ),
        );
      } else {
        setComments((prev) => [newComment, ...prev]);
      }
      setCommentText('');
      setReplyTarget(null);
    } catch {
      toast.error('KhÃ´ng thá»ƒ thÃªm bÃ¬nh luáº­n.');
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
  const authorLabel = post.user?.username || post.user?.name || 'ThÃ nh viÃªn';
  const isOwner = user?.id === post.userId;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await postService.deletePost(post.id);
      toast.success('ÄÃ£ xÃ³a bÃ i viáº¿t.');
      onDeleted?.(post.id);
      onClose();
    } catch (error) {
      toast.error(getApiMessage(error, 'KhÃ´ng thá»ƒ xÃ³a bÃ i viáº¿t.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeletedComment = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(28,30,33,0.72)] p-0 backdrop-blur-sm sm:p-6" onClick={handleBackdropClick}>
      <div className="surface-card relative flex h-[100dvh] w-full max-w-[1240px] flex-col overflow-hidden md:h-[88dvh] md:max-h-[860px] md:rounded-xl md:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-[rgba(28,30,33,0.72)] p-2 text-white transition hover:bg-[rgba(28,30,33,0.88)]"
          aria-label="ÄÃ³ng"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="relative flex w-full items-center justify-center bg-[var(--app-text)] md:flex-1">
          <div className="absolute right-4 top-4 z-20 flex flex-col items-end">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowOptionsDropdown(!showOptionsDropdown); }}
              disabled={isDeleting}
              className="rounded-full bg-[rgba(28,30,33,0.72)] p-2 text-white transition hover:bg-[rgba(28,30,33,0.88)] disabled:opacity-50"
              aria-label="TÃ¹y chá»n bÃ i viáº¿t"
            >
              <DotsIcon className="h-5 w-5" />
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
                <div className="absolute right-0 top-full mt-2 z-[70] w-[320px] rounded-xl bg-[var(--app-bg)] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-[var(--app-border)]">
                  {isOwner ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowOptionsDropdown(false); handleTogglePin(); }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--app-bg-soft)] text-[var(--app-text)]">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--app-text)]">{localIsPinned ? 'Bá» ghim bÃ i viáº¿t' : 'Ghim bÃ i viáº¿t'}</div>
                          <div className="text-xs text-[var(--app-muted)]">{localIsPinned ? 'Gá»¡ bÃ i nÃ y khá»i mÃ n hÃ¬nh Profile cá»§a báº¡n.' : 'ÄÆ°a bÃ i nÃ y lÃªn Ä‘áº§u trang cÃ¡ nhÃ¢n cá»§a báº¡n.'}</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowOptionsDropdown(false); setIsEditing(true); setEditCaptionText(localCaption); }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--app-bg-soft)] text-[var(--app-text)]">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--app-text)]">Chá»‰nh sá»­a bÃ i viáº¿t</div>
                          <div className="text-xs text-[var(--app-muted)]">Cáº­p nháº­t ná»™i dung vÄƒn báº£n.</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowOptionsDropdown(false); setIsDeleteOpen(true); }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--app-bg-soft)] text-[var(--app-text)]">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--app-text)]">XÃ³a bÃ i viáº¿t</div>
                          <div className="text-xs text-[var(--app-muted)]">Gá»¡ bÃ i viáº¿t nÃ y khá»i dÃ²ng thá»i gian.</div>
                        </div>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowOptionsDropdown(false); setReportTarget({ id: post.id, type: 'post' }); }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--app-bg-soft)] text-[var(--app-text)]">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--app-text)]">BÃ¡o cÃ¡o bÃ i viáº¿t</div>
                          <div className="text-xs text-[var(--app-muted)]">ChÃºng tÃ´i sáº½ khÃ´ng cho {authorLabel} biáº¿t ai Ä‘Ã£ bÃ¡o cÃ¡o.</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setShowOptionsDropdown(false);
                          try {
                            await userService.unfollowUser(post.userId);
                            toast.success(`ÄÃ£ bá» theo dÃµi ${authorLabel}`);
                          } catch {
                            toast.error('KhÃ´ng thá»ƒ bá» theo dÃµi lÃºc nÃ y.');
                          }
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--app-bg-soft)] text-[var(--app-text)]">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--app-text)]">Bá» theo dÃµi {authorLabel}</div>
                          <div className="text-xs text-[var(--app-muted)]">KhÃ´ng nhÃ¬n tháº¥y bÃ i viáº¿t ná»¯a nhÆ°ng váº«n lÃ  báº¡n bÃ¨.</div>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

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
                alt={post.caption || 'PhÆ°Æ¡ng tiá»‡n bÃ i viáº¿t'}
                className="h-auto max-h-[60vh] w-full object-contain md:h-full md:max-h-full"
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/70">KhÃ´ng cÃ³ phÆ°Æ¡ng tiá»‡n kháº£ dá»¥ng</div>
          )}

          {media.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setCurrentMediaIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentMediaIndex === 0}
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-40"
                aria-label="PhÆ°Æ¡ng tiá»‡n trÆ°á»›c"
              >
                <ChevronIcon direction="left" className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMediaIndex((prev) => Math.min(media.length - 1, prev + 1))}
                disabled={currentMediaIndex === media.length - 1}
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-40"
                aria-label="PhÆ°Æ¡ng tiá»‡n sau"
              >
                <ChevronIcon direction="right" className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>

        <div className="flex w-full flex-col bg-[var(--app-surface)] text-[var(--app-text)] md:w-[420px] md:border-l md:border-[var(--app-border)]">
          <div className="flex items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
              <Link to={`/${post.user?.username || post.user?.id}`} onClick={onClose}>
                <Avatar src={post.user?.avatarUrl} name={post.user?.name} username={post.user?.username} size="sm" ring />
              </Link>
              <div>
                <Link to={`/${post.user?.username || post.user?.id}`} onClick={onClose} className="text-sm font-semibold text-[var(--app-text)] hover:underline">{post.user?.username || post.user?.name || 'ThÃ nh viÃªn'}</Link>
                <div className="text-xs text-[var(--app-muted)]">
                  {createdAt}
                  {localIsEdited ? ' Â· ÄÃ£ chá»‰nh sá»­a' : ''}
                </div>
              </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-sm">
            {localIsPinned && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--app-muted)]">
                <PushPin size={14} weight="fill" aria-hidden="true" />
                <span>Đã ghim</span>
              </div>
            )}
            {isEditing ? (
              <div className="mb-4">
                <textarea
                  className="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-3 text-sm text-[var(--app-text)] focus:border-[var(--app-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                  rows={4}
                  value={editCaptionText}
                  onChange={(e) => setEditCaptionText(e.target.value)}
                  disabled={isSavingEdit}
                  placeholder="Nháº­p ná»™i dung bÃ i viáº¿t..."
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-sm font-semibold text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]"
                    onClick={() => setIsEditing(false)}
                    disabled={isSavingEdit}
                  >
                    Há»§y
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-[var(--app-primary)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--app-primary-strong)] disabled:opacity-50"
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? 'Đang lưu…' : 'Lưu xong'}
                  </button>
                </div>
              </div>
            ) : localCaption?.trim() ? (
              <PostCaption
                text={localCaption}
                collapsedLength={320}
                className="flex-1"
                textClassName="text-[var(--app-text)] leading-6"
              />
            ) : null}

            {isLoadingComments ? (
              <p className="text-xs font-semibold text-[var(--app-muted)]">Đang tải bình luận…</p>
            ) : comments.length === 0 ? (
              <div className="rounded-lg bg-[var(--app-bg-soft)] px-4 py-4 text-xs font-semibold text-[var(--app-muted)]">ChÆ°a cÃ³ bÃ¬nh luáº­n nÃ o.</div>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.id}
                  onDeleted={handleDeletedComment}
                  onReport={(id) => setReportTarget({ id, type: 'comment' })}
                  onReplyClick={handleReplyClick}
                  onNavigate={onClose}
                  postId={post.id}
                />
              ))
            )}
          </div>

          <div className="border-t border-[var(--app-border)] px-5 py-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={handleLikeToggle} className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition ${liked ? 'text-[var(--app-accent)]' : 'text-[var(--app-text)] hover:opacity-70'}`}>
                <HeartIcon filled={liked} className="h-6 w-6" />
              </button>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--app-text)]">
                <CommentIcon className="h-6 w-6 text-[var(--app-text)]" />
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm font-semibold text-[var(--app-text)]">{likesCount} lÆ°á»£t thÃ­ch</p>
                <p className="text-xs text-[var(--app-muted)]">{comments.reduce((acc, c) => acc + 1 + (c.repliesCount || 0), 0)} bÃ¬nh luáº­n</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitComment} className="border-t border-[var(--app-border)] px-5 py-4">
            {replyTarget && (
              <div className="mb-2 flex items-center gap-2 text-xs text-[var(--app-muted)]">
                <span>Tráº£ lá»i <strong>@{replyTarget.user?.username || replyTarget.user?.name}</strong></span>
                <button
                  type="button"
                  onClick={handleCancelReply}
                  className="text-[var(--app-muted)] hover:text-[var(--app-text)] transition"
                  aria-label="Hủy trả lời"
                >
                  X
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-full border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-4 py-2">
            <input
              ref={commentInputRef}
              type="text"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder={replyTarget ? `Tráº£ lá»i @${replyTarget.user?.username || replyTarget.user?.name}...` : 'ThÃªm bÃ¬nh luáº­n...'}
              className="min-h-[44px] flex-1 bg-transparent text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
              onKeyDown={(e) => {
                if (e.key === 'Escape' && replyTarget) {
                  handleCancelReply();
                }
              }}
            />
            <button type="submit" disabled={!commentText.trim() || isSubmitting} className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-[var(--app-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)] disabled:opacity-50">
              ÄÄƒng
            </button>
            </div>
          </form>
        </div>
      </div>
    </div>
      <ConfirmDialog
        open={isDeleteOpen}
        title="Xóa bài viết?"
        description="Bài viết này sẽ bị gỡ khỏi dòng thời gian. Hành động này không thể hoàn tác."
        confirmLabel="Xóa bài viết"
        variant="danger"
        isLoading={isDeleting}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
      />
      {reportTarget ? (
        <ReportModal targetId={reportTarget.id} targetType={reportTarget.type} onClose={() => setReportTarget(null)} />
      ) : null}
    </>
  );
};
