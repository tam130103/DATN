import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Comment, Post, User } from '../types';
import { engagementService } from '../services/engagement.service';
import { postService } from '../services/post.service';
import { useAuth } from '../contexts/AuthContext';
import { Avatar } from './common/Avatar';
import { chatService } from '../services/chat.service';
import { userService } from '../services/user.service';

import { PostCaption } from './PostCaption';
import { ReportModal } from './ReportModal';

interface PostCardProps {
  post: Post;
  onDeleted?: (postId: string) => void;
}

const getApiMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as any).response?.data;
    if (typeof response?.message === 'string') {
      return response.message;
    }
    if (Array.isArray(response?.message) && response.message.length > 0) {
      return response.message[0];
    }
  }

  return fallback;
};

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

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="6" cy="12" r="1.5" />
    <circle cx="18" cy="12" r="1.5" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

const iconButtonClass =
  'inline-flex items-center justify-center text-[var(--app-text)] transition hover:opacity-70';

export const PostCard: React.FC<PostCardProps> = ({ post, onDeleted }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const targetCommentId = searchParams.get('commentId');

  const { user } = useAuth();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [liked, setLiked] = useState(post.liked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [saved, setSaved] = useState(post.saved || false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFollowing, setShareFollowing] = useState<User[]>([]);
  const [shareQuery, setShareQuery] = useState('');
  const [selectedShareUsers, setSelectedShareUsers] = useState<Set<string>>(new Set());
  const [isSendingShare, setIsSendingShare] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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
  }, [post]);

  const media = useMemo(
    () => [...(post.media || [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [post.media],
  );
  const currentMedia = media[currentMediaIndex] ?? media[0];

  useEffect(() => {
    if (targetCommentId && !showComments) {
      loadComments();
    }
  }, [targetCommentId, showComments, post.id]);

  useEffect(() => {
    if (targetCommentId && showComments && comments.length > 0) {
      const timeoutId = setTimeout(() => {
        const el = document.getElementById(`comment-${targetCommentId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('animate-blink');
          setTimeout(() => {
            el.classList.remove('animate-blink');
          }, 3000);
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [targetCommentId, showComments, comments]);

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

  const handleSaveToggle = async () => {
    const originalSaved = saved;
    setSaved(!originalSaved);
    try {
      const result = await engagementService.toggleSave(post.id);
      setSaved(result.saved);
      toast.success(result.saved ? 'Đã lưu vào bộ sưu tập.' : 'Đã xoá khỏi mục đã lưu.');
    } catch {
      setSaved(originalSaved);
      toast.error('Không thể lưu bài viết.');
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
      toast.error('Không thể tải bình luận.');
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    const content = commentText.trim();
    setCommentText('');

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
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === optimisticComment.id
            ? { ...newComment, user: newComment.user ?? optimisticComment.user }
            : comment,
        ),
      );
    } catch {
      setComments((prev) => prev.filter((comment) => comment.id !== optimisticComment.id));
      toast.error('Không thể thêm bình luận.');
    }
  };

  const handleShare = useCallback(async () => {
    setShowShareModal(true);
    if (shareFollowing.length === 0 && user?.id) {
      try {
        const list = await userService.getFollowing(user.id, 1, 50);
        setShareFollowing(list);
      } catch {
        toast.error('Không thể tải danh sách đang theo dõi.');
      }
    }
  }, [shareFollowing.length, user?.id]);

  const filteredShareUsers = useMemo(
    () =>
      shareFollowing.filter(
        (u) =>
          !shareQuery.trim() ||
          (u.username || '').toLowerCase().includes(shareQuery.toLowerCase()) ||
          (u.name || '').toLowerCase().includes(shareQuery.toLowerCase()),
      ),
    [shareFollowing, shareQuery],
  );

  const toggleShareUser = (id: string) => {
    setSelectedShareUsers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setSelectedShareUsers(new Set());
    setShareQuery('');
  };

  const handleSendShare = async () => {
    if (selectedShareUsers.size === 0) return;
    const postUrl = `${window.location.origin}/posts/${post.id}`;
    const message = `Check out this post: ${postUrl}`;
    setIsSendingShare(true);

    try {
      await Promise.all(
        Array.from(selectedShareUsers).map(async (userId) => {
          const conversation = await chatService.createConversation({ participantIds: [userId] });
          await chatService.sendMessage(conversation.id, message);
        }),
      );
      toast.success(
        `Đã chia sẻ cho ${selectedShareUsers.size} người.`,
      );
      closeShareModal();
    } catch {
      toast.error('Gửi thất bại. Vui lòng thử lại.');
    } finally {
      setIsSendingShare(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Xóa bài viết này?')) return;
    setIsDeleting(true);
    try {
      await postService.deletePost(post.id);
      toast.success('Đã xóa bài viết.');
      onDeleted?.(post.id);
    } catch (error) {
      toast.error(getApiMessage(error, 'Không thể xóa bài viết.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePin = async () => {
    try {
      await postService.togglePin(post.id);
      setLocalIsPinned(!localIsPinned);
      toast.success(localIsPinned ? 'Đã bỏ ghim bài viết.' : 'Đã ghim bài viết.');
    } catch {
      toast.error('Không thể thao tác ghim.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editCaptionText.trim()) {
      toast.error('Nội dung không được để trống.');
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
      toast.success('Đã cập nhật bài viết.');
    } catch (error) {
      toast.error(getApiMessage(error, 'Không thể sửa bài viết.'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const profilePath = post.user ? `/${post.user.username || post.user.id}` : '#';
  const displayName = post.user?.username || post.user?.name || 'user';
  const isOwner = user?.id === post.userId;
  const commentsCount = showComments ? comments.length : (post.commentsCount ?? 0);

  return (
    <article className="surface-card overflow-hidden rounded-xl">
      {localIsPinned && (
        <div className="px-4 pt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--app-muted)]">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
          Đã ghim
        </div>
      )}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Link to={profilePath} className="flex min-w-0 items-center gap-3">
          <Avatar
            src={post.user?.avatarUrl}
            name={post.user?.name}
            username={post.user?.username}
            size="md"
            ring
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--app-text)]">{displayName}</p>
            <p className="text-xs text-[var(--app-muted)]">
              {timeAgo(post.createdAt)}
              {localIsEdited ? ' · Đã chỉnh sửa' : ''}
            </p>
          </div>
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowOptionsDropdown(prev => !prev)}
            disabled={isDeleting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)] disabled:opacity-50"
            title="Tùy chọn bài viết"
          >
            <MoreIcon />
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
              <div className="absolute right-0 top-full mt-1 z-[70] w-[320px] rounded-xl bg-[var(--app-bg)] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-gray-200">
                {isOwner ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowOptionsDropdown(false); handleTogglePin(); }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">{localIsPinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}</div>
                        <div className="text-xs text-[var(--app-muted)]">{localIsPinned ? 'Gỡ bài này khỏi màn hình Profile của bạn.' : 'Đưa bài này lên đầu trang cá nhân của bạn.'}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowOptionsDropdown(false); setIsEditing(true); setEditCaptionText(localCaption); }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">Chỉnh sửa bài viết</div>
                        <div className="text-xs text-[var(--app-muted)]">Cập nhật nội dung văn bản.</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowOptionsDropdown(false); handleDelete(); }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">Xóa bài viết</div>
                        <div className="text-xs text-[var(--app-muted)]">Gỡ bài viết này khỏi dòng thời gian.</div>
                      </div>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowOptionsDropdown(false); setShowReportModal(true); }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">Báo cáo bài viết</div>
                        <div className="text-xs text-[var(--app-muted)]">Chúng tôi sẽ không cho {displayName} biết ai đã báo cáo.</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowOptionsDropdown(false); toast.success('Đã ẩn bài viết'); }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">Ẩn bài viết</div>
                        <div className="text-xs text-[var(--app-muted)]">Ẩn bớt các bài viết tương tự.</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowOptionsDropdown(false); toast.success(`Đã bỏ theo dõi ${displayName}`); }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">Bỏ theo dõi {displayName}</div>
                        <div className="text-xs text-[var(--app-muted)]">Không nhìn thấy bài viết nữa nhưng vẫn là bạn bè.</div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {media.length > 0 && currentMedia ? (
        <div className="relative border-y border-[var(--app-border)] bg-black">
          <div className="relative aspect-square">
            {currentMedia.type === 'IMAGE' ? (
              <img src={currentMedia.url} alt="" className="h-full w-full object-contain" />
            ) : (
              <video src={currentMedia.url} controls className="h-full w-full object-contain" />
            )}

            {media.length > 1 ? (
              <>
                {currentMediaIndex > 0 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentMediaIndex((prev) => prev - 1)}
                    className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-sm font-semibold text-[var(--app-text)]"
                  >
                    {'<'}
                  </button>
                ) : null}

                {currentMediaIndex < media.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentMediaIndex((prev) => prev + 1)}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-sm font-semibold text-[var(--app-text)]"
                  >
                    {'>'}
                  </button>
                ) : null}

                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {media.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 w-1.5 rounded-full ${
                        index === currentMediaIndex ? 'bg-white' : 'bg-white/45'
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="px-4 py-3">
        {/* Caption above action buttons */}
        {isEditing ? (
          <div className="mb-3">
            <textarea
              className="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-3 text-sm text-[var(--app-text)] focus:border-[var(--app-primary)] focus:outline-none"
              rows={3}
              value={editCaptionText}
              onChange={(e) => setEditCaptionText(e.target.value)}
              disabled={isSavingEdit}
              placeholder="Nhập nội dung bài viết..."
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm font-semibold text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]"
                onClick={() => setIsEditing(false)}
                disabled={isSavingEdit}
              >
                Hủy
              </button>
              <button
                type="button"
                className="rounded-md bg-[var(--app-primary)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--app-primary-strong)] disabled:opacity-50"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? 'Đang lưu...' : 'Lưu xong'}
              </button>
            </div>
          </div>
        ) : localCaption?.trim() ? (
          <div className="mb-3">
            <PostCaption
              text={localCaption}
              textClassName="text-[var(--app-text)] leading-6"
            />
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button type="button" onClick={handleLikeToggle} className={iconButtonClass}>
              <HeartIcon filled={liked} />
            </button>

            <button
              type="button"
              onClick={loadComments}
              disabled={isLoadingComments}
              className={iconButtonClass}
            >
              <CommentIcon />
            </button>

            <button type="button" onClick={handleShare} className={iconButtonClass}>
              <ShareIcon />
            </button>
          </div>

          <button type="button" onClick={handleSaveToggle} className={`${iconButtonClass} transition-transform active:scale-90`}>
            <BookmarkIcon filled={saved} />
          </button>
        </div>

        <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
          {likesCount.toLocaleString()} lượt thích
        </p>

        <button
          type="button"
          onClick={loadComments}
          className="mt-1 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
        >
          {commentsCount > 0 ? `Xem tất cả ${commentsCount} bình luận` : 'Thêm bình luận'}
        </button>

        {showComments ? (
          <div className="mt-3 space-y-2">
            {comments.length === 0 ? (
              <p className="text-sm text-[var(--app-muted)]">Chưa có bình luận nào.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} id={`comment-${comment.id}`} className="flex items-start gap-3 rounded-lg p-2 transition-colors">
                  <Avatar
                    src={comment.user?.avatarUrl}
                    name={comment.user?.name}
                    username={comment.user?.username}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1 text-sm leading-6 text-[var(--app-text)]">
                    <span className="mr-1 font-semibold text-[var(--app-text)]">
                      {comment.user?.username || comment.user?.name || user?.username || 'user'}
                    </span>
                    {comment.content}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmitComment}
          className="mt-3 flex items-center gap-3 border-t border-[var(--app-border)] pt-3"
        >
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Thêm bình luận..."
            className="min-h-[34px] flex-1 bg-transparent text-sm text-[var(--app-text)]"
          />
          {commentText.trim() ? (
            <button
              type="submit"
              className="text-sm font-semibold text-[var(--app-primary)] transition hover:text-[var(--app-primary-strong)]"
            >
              Đăng
            </button>
          ) : null}
        </form>
      </div>

      {showShareModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeShareModal();
            }
          }}
        >
          <div
            className="surface-card flex w-full max-w-md flex-col overflow-hidden rounded-xl"
            style={{ maxHeight: '80vh' }}
          >
            <div className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4">
              <p className="text-base font-semibold text-[var(--app-text)]">Chia sẻ</p>
              <button
                type="button"
                onClick={closeShareModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[var(--app-bg-soft)]"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="border-b border-[var(--app-border)] px-4 py-4">
              <div className="flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-3 py-2.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--app-muted)]" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  autoFocus
                  value={shareQuery}
                  onChange={(e) => setShareQuery(e.target.value)}
                  placeholder="Tìm kiếm người dùng..."
                  className="flex-1 bg-transparent text-sm text-[var(--app-text)]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {filteredShareUsers.length === 0 ? (
                <p className="rounded-lg bg-[var(--app-bg-soft)] px-4 py-6 text-center text-sm text-[var(--app-muted)]">
                  {shareFollowing.length === 0 ? 'Đang tải người bạn theo dõi...' : 'Không tìm thấy người dùng.'}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredShareUsers.map((shareUser) => {
                    const isSelected = selectedShareUsers.has(shareUser.id);
                    return (
                      <button
                        key={shareUser.id}
                        type="button"
                        onClick={() => toggleShareUser(shareUser.id)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-[var(--app-bg-soft)]"
                      >
                        <Avatar
                          src={shareUser.avatarUrl}
                          name={shareUser.name}
                          username={shareUser.username}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                            {shareUser.username || shareUser.name}
                          </p>
                          {shareUser.name && shareUser.username ? (
                            <p className="truncate text-sm text-[var(--app-muted)]">
                              {shareUser.name}
                            </p>
                          ) : null}
                        </div>
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                            isSelected
                              ? 'border-[var(--app-primary)] bg-[var(--app-primary)] text-white'
                              : 'border-[var(--app-border)] text-transparent'
                          }`}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-[var(--app-border)] px-4 py-4">
              <button
                type="button"
                onClick={handleSendShare}
                disabled={selectedShareUsers.size === 0 || isSendingShare}
                className="inline-flex min-h-[40px] w-full items-center justify-center rounded-md bg-[var(--app-primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)] disabled:opacity-40"
              >
                {isSendingShare
                  ? 'Đang gửi...'
                  : `Gửi${selectedShareUsers.size > 0 ? ` (${selectedShareUsers.size})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showReportModal && (
        <ReportModal postId={post.id} onClose={() => setShowReportModal(false)} />
      )}
    </article>
  );
};
