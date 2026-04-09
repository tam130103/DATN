import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Comment, Post } from '../types';
import { Avatar } from './common/Avatar';
import { engagementService } from '../services/engagement.service';
import { postService } from '../services/post.service';
import { useAuth } from '../contexts/AuthContext';
import { PostCaption } from './PostCaption';
import { ReportModal } from './ReportModal';

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
          toast.error('Không thể tải bình luận.');
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
      toast.error('Không thể cập nhật lượt thích.');
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
    if (!editCaptionText?.trim()) {
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

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newComment = await engagementService.createComment(post.id, commentText.trim());
      setComments((prev) => [newComment, ...prev]);
      setCommentText('');
    } catch {
      toast.error('Không thể thêm bình luận.');
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
  const profilePath = post.user?.username ? `/${post.user.username}` : undefined;
  const authorLabel = post.user?.username || post.user?.name || 'Thành viên';
  const isOwner = user?.id === post.userId;

  const handleDelete = async () => {
    if (!window.confirm('Xóa bài viết này?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await postService.deletePost(post.id);
      toast.success('Đã xóa bài viết.');
      onDeleted?.(post.id);
      onClose();
    } catch (error) {
      toast.error(getApiMessage(error, 'Không thể xóa bài viết.'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-0 backdrop-blur-sm sm:p-6" onClick={handleBackdropClick}>
      <div className="surface-card relative flex h-screen w-full max-w-[1240px] flex-col overflow-hidden md:h-[88vh] md:max-h-[860px] md:rounded-xl md:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/70 p-2 text-white transition hover:bg-black"
          aria-label="Đóng"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="relative flex w-full items-center justify-center bg-slate-950 md:flex-1">
          <div className="absolute right-4 top-4 z-20 flex flex-col items-end">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowOptionsDropdown(!showOptionsDropdown); }}
              disabled={isDeleting}
              className="rounded-full bg-black/70 p-2 text-white transition hover:bg-black disabled:opacity-50"
              aria-label="Tùy chọn bài viết"
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-800">
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-800">
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-800">
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-800">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--app-text)]">Báo cáo bài viết</div>
                          <div className="text-xs text-[var(--app-muted)]">Chúng tôi sẽ không cho {authorLabel} biết ai đã báo cáo.</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowOptionsDropdown(false); toast.success('Đã ẩn bài viết'); }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-800">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--app-text)]">Ẩn bài viết</div>
                          <div className="text-xs text-[var(--app-muted)]">Ẩn bớt các bài viết tương tự.</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowOptionsDropdown(false); toast.success(`Đã bỏ theo dõi ${authorLabel}`); }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-800">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--app-text)]">Bỏ theo dõi {authorLabel}</div>
                          <div className="text-xs text-[var(--app-muted)]">Không nhìn thấy bài viết nữa nhưng vẫn là bạn bè.</div>
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
                alt={post.caption || 'Phương tiện bài viết'}
                className="h-auto max-h-[60vh] w-full object-contain md:h-full md:max-h-full"
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/70">Không có phương tiện khả dụng</div>
          )}

          {media.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setCurrentMediaIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentMediaIndex === 0}
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-40"
                aria-label="Phương tiện trước"
              >
                <ChevronIcon direction="left" className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMediaIndex((prev) => Math.min(media.length - 1, prev + 1))}
                disabled={currentMediaIndex === media.length - 1}
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-40"
                aria-label="Phương tiện sau"
              >
                <ChevronIcon direction="right" className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>

        <div className="flex w-full flex-col bg-[var(--app-surface)] text-[var(--app-text)] md:w-[420px] md:border-l md:border-[var(--app-border)]">
          <div className="flex items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
              <Avatar src={post.user?.avatarUrl} name={post.user?.name} username={post.user?.username} size="sm" ring />
              <div>
                <div className="text-sm font-semibold text-[var(--app-text)]">{post.user?.username || post.user?.name || 'Thành viên'}</div>
                <div className="text-xs text-[var(--app-muted)]">
                  {createdAt}
                  {localIsEdited ? ' · Đã chỉnh sửa' : ''}
                </div>
              </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-sm">
            {localIsPinned && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--app-muted)]">
                📌 Đã ghim
              </div>
            )}
            {isEditing ? (
              <div className="mb-4">
                <textarea
                  className="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-3 text-sm text-[var(--app-text)] focus:border-[var(--app-primary)] focus:outline-none"
                  rows={4}
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
              <PostCaption
                text={localCaption}
                prefixLabel={authorLabel}
                prefixTo={profilePath}
                collapsedLength={320}
                className="flex-1"
                textClassName="text-[var(--app-text)] leading-6"
              />
            ) : null}

            {isLoadingComments ? (
              <p className="text-xs font-semibold text-[var(--app-muted)]">Đang tải bình luận...</p>
            ) : comments.length === 0 ? (
              <div className="rounded-lg bg-[var(--app-bg-soft)] px-4 py-4 text-xs font-semibold text-[var(--app-muted)]">Chưa có bình luận nào.</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <Avatar src={comment.user?.avatarUrl} name={comment.user?.name} username={comment.user?.username} size="sm" />
                  <p className="text-[var(--app-text)]">
                    <span className="font-semibold text-[var(--app-text)]">
                      {comment.user?.username || comment.user?.name || 'Thành viên'}
                    </span>{' '}
                    {comment.content}
                  </p>
                </div>
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
                <p className="text-sm font-semibold text-[var(--app-text)]">{likesCount} lượt thích</p>
                <p className="text-xs text-[var(--app-muted)]">{comments.length} bình luận</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitComment} className="border-t border-[var(--app-border)] px-5 py-4">
            <div className="flex items-center gap-3 rounded-full border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-4 py-2">
            <input
              type="text"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Thêm bình luận..."
              className="min-h-[44px] flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
            />
            <button type="submit" disabled={!commentText.trim() || isSubmitting} className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-[var(--app-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)] disabled:opacity-50">
              Đăng
            </button>
            </div>
          </form>
        </div>
      </div>
    </div>
      {showReportModal ? (
        <ReportModal postId={post.id} onClose={() => setShowReportModal(false)} />
      ) : null}
    </>
  );
};
