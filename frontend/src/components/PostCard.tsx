import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Comment, Post } from '../types';
import { engagementService } from '../services/engagement.service';
import { postService } from '../services/post.service';
import { useAuth } from '../contexts/AuthContext';
import { getApiMessage } from '../utils/api-error';
import { PostCaption } from './PostCaption';
import { ReportModal } from './ReportModal';

// Sub-components
import { PostHeader } from './post/PostHeader';
import { PostMedia } from './post/PostMedia';
import { PostActions } from './post/PostActions';
import { PostComments } from './post/PostComments';
import { PostShareModal } from './post/PostShareModal';

interface PostCardProps {
  post: Post;
  highlightCommentId?: string;
  onDeleted?: (postId: string) => void;
}





export const PostCard: React.FC<PostCardProps> = ({ post, highlightCommentId, onDeleted }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const targetCommentId = highlightCommentId || searchParams.get('commentId') || searchParams.get('highlightComment');

  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [saved, setSaved] = useState(post.saved || false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; type: 'post' | 'comment' } | null>(null);

  const [localCaption, setLocalCaption] = useState(post.caption);
  const [localIsEdited, setLocalIsEdited] = useState(post.isEdited || false);
  const [localIsPinned, setLocalIsPinned] = useState(post.isPinned || false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCaptionText, setEditCaptionText] = useState(post.caption);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const ensureCommentsLoaded = useCallback(async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    try {
      const data = await engagementService.getPostComments(post.id);
      setComments(data);
      setShowComments(true);
    } catch {
      toast.error('Không thể tải bình luận.');
    }
  }, [post.id, showComments]);

  useEffect(() => {
    setLocalCaption(post.caption);
    setLocalIsEdited(post.isEdited || false);
    setLocalIsPinned(post.isPinned || false);
    setLiked(post.liked || false);
    setLikesCount(post.likesCount || 0);
    setSaved(post.saved || false);
  }, [post]);

  useEffect(() => {
    if (targetCommentId && !showComments) {
      void ensureCommentsLoaded();
    }
  }, [targetCommentId, showComments, ensureCommentsLoaded]);

  useEffect(() => {
    if (!targetCommentId || !showComments || comments.length === 0) return;

    let cancelled = false;
    let removeTimer: ReturnType<typeof setTimeout>;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        const el = document.getElementById(`comment-${targetCommentId}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        removeTimer = setTimeout(() => {
          if (cancelled) return;
          el.classList.add('comment-highlight');
          setTimeout(() => { el.classList.remove('comment-highlight'); }, 5500);
        }, 700);
      });
    });

    return () => {
      cancelled = true;
      clearTimeout(removeTimer);
    };
  }, [targetCommentId, showComments, comments]);

  const handleLikeToggle = async () => {
    const originalLiked = liked;
    const originalCount = likesCount;
    setLiked(!originalLiked);
    setLikesCount(!originalLiked ? originalCount + 1 : Math.max(0, originalCount - 1));

    try {
      const result = await engagementService.toggleLike(post.id);
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch {
      setLiked(originalLiked);
      setLikesCount(originalCount);
      toast.error('Không thể cập nhật lượt thích.');
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

  const loadComments = useCallback(async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    try {
      const data = await engagementService.getPostComments(post.id);
      setComments(data);
      setShowComments(true);
    } catch {
      toast.error('Không thể tải bình luận.');
    }
  }, [post.id, showComments]);

  const handleShare = useCallback(() => {
    setShowShareModal(true);
  }, []);

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

  const isOwner = user?.id === post.userId;
  const commentsCount = showComments ? comments.length : (post.commentsCount ?? 0);

  return (
    <article className="surface-card overflow-hidden rounded-xl">
      <PostHeader
        user={post.user}
        createdAt={post.createdAt}
        isEdited={localIsEdited}
        isPinned={localIsPinned}
        isOwner={isOwner}
        onTogglePin={handleTogglePin}
        onEdit={() => { setIsEditing(true); setEditCaptionText(localCaption); }}
        onDelete={handleDelete}
        onReport={() => setReportTarget({ id: post.id, type: 'post' })}
        showOptionsDropdown={showOptionsDropdown}
        setShowOptionsDropdown={setShowOptionsDropdown}
        isDeleting={isDeleting}
      />

      <PostMedia media={post.media || []} />

      <div className="px-3 pt-1 pb-3">
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
                className="rounded-md px-3 py-1.5 text-sm font-semibold text-[var(--app-text)] hover:bg-[var(--app-bg-soft)] transition"
                onClick={() => setIsEditing(false)}
                disabled={isSavingEdit}
              >
                Hủy
              </button>
              <button
                type="button"
                className="rounded-md bg-[var(--app-primary)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--app-primary-strong)] disabled:opacity-50 transition"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? 'Đang lưu...' : 'Lưu bài viết'}
              </button>
            </div>
          </div>
        ) : localCaption?.trim() ? (
          <div className="mb-2">
            <PostCaption text={localCaption} textClassName="text-[var(--app-text)] text-[14.5px] leading-6" />
          </div>
        ) : null}

        <PostActions
          liked={liked}
          likesCount={likesCount}
          onLikeToggle={handleLikeToggle}
          saved={saved}
          onSaveToggle={handleSaveToggle}
          onCommentToggle={loadComments}
          commentsCount={commentsCount}
          onShare={handleShare}
        />

        {commentsCount > 0 && !showComments && (
          <button
            type="button"
            onClick={loadComments}
            className="mt-1 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)] font-medium"
          >
            Xem các bình luận
          </button>
        )}

        <PostComments
          postId={post.id}
          comments={comments}
          setComments={setComments}
          showComments={showComments}
          onReport={(id) => setReportTarget({ id, type: 'comment' })}
        />
      </div>

      <PostShareModal
        postId={post.id}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      {reportTarget && (
        <ReportModal targetId={reportTarget.id} targetType={reportTarget.type} onClose={() => setReportTarget(null)} />
      )}
    </article>
  );
};
