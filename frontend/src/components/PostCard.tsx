import React, { memo, useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Comment, Post } from '../types';
import { engagementService } from '../services/engagement.service';
import { postService } from '../services/post.service';
import { useAuth } from '../contexts/AuthContext';
import { getApiMessage } from '../utils/api-error';
import { PostCaption } from './PostCaption';
import { ReportModal } from './ReportModal';
import { ConfirmDialog } from './common/ConfirmDialog';
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

export const PostCard: React.FC<PostCardProps> = memo(({ post, highlightCommentId, onDeleted }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isTargetPost = location.pathname.includes(`/posts/${post.id}`);
  const urlCommentId = searchParams.get('commentId') || searchParams.get('highlightComment');
  const urlParentId = searchParams.get('parentId');
  const targetCommentId = highlightCommentId || (isTargetPost ? urlCommentId : null);
  const targetParentId = isTargetPost ? urlParentId : null;

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
      toast.success(result.saved ? 'Đã lưu vào bộ sưu tập.' : 'Đã xóa khỏi mục đã lưu.');
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

  const handleDelete = useCallback(async () => {
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
  }, [post.id, onDeleted]);

  const handleTogglePin = useCallback(async () => {
    try {
      await postService.togglePin(post.id);
      setLocalIsPinned((prev) => !prev);
      toast.success(localIsPinned ? 'Đã bỏ ghim bài viết.' : 'Đã ghim bài viết.');
    } catch {
      toast.error('Không thể thao tác ghim.');
    }
  }, [post.id, localIsPinned]);

  const handleSaveEdit = useCallback(async () => {
    const nextCaption = editCaptionText.trim();
    if (!nextCaption) {
      toast.error('Nội dung không được để trống.');
      return;
    }
    if (nextCaption === localCaption) {
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
  }, [editCaptionText, localCaption, post.id]);

  const isOwner = user?.id === post.userId;
  const commentsCount = showComments
    ? comments.reduce((acc, comment) => acc + 1 + (comment.repliesCount || 0), 0)
    : (post.commentsCount ?? 0);

  return (
    <article className="cursor-pointer spring-ease border-b border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-bg-soft)] last:border-b-0">
      <PostHeader
        user={post.user}
        createdAt={post.createdAt}
        isEdited={localIsEdited}
        isPinned={localIsPinned}
        isOwner={isOwner}
        onTogglePin={handleTogglePin}
        onEdit={() => {
          setIsEditing(true);
          setEditCaptionText(localCaption);
        }}
        onDelete={() => setShowDeleteConfirm(true)}
        onReport={() => setReportTarget({ id: post.id, type: 'post' })}
        showOptionsDropdown={showOptionsDropdown}
        setShowOptionsDropdown={setShowOptionsDropdown}
        isDeleting={isDeleting}
      />

      <PostMedia media={post.media || []} />

      <div className="px-3 pb-3 pt-1">
        {isEditing ? (
          <div className="mb-3">
            <textarea
              className="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-3 text-sm text-[var(--app-text)] focus:border-[var(--app-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
              rows={3}
              value={editCaptionText}
              onChange={(event) => setEditCaptionText(event.target.value)}
              disabled={isSavingEdit}
              placeholder="Nhập nội dung bài viết…"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className="spring-ease rounded-md px-3 py-1.5 text-sm font-semibold text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]"
                onClick={() => setIsEditing(false)}
                disabled={isSavingEdit}
              >
                Hủy
              </button>
              <button
                type="button"
                className="spring-ease rounded-md bg-[var(--app-primary)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--app-primary-strong)] disabled:bg-[var(--app-border)] disabled:text-[var(--app-muted)]"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? 'Đang lưu…' : 'Lưu bài viết'}
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
            className="spring-ease mt-1 text-sm font-medium text-[var(--app-muted)] hover:text-[var(--app-text)]"
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
          highlightCommentId={targetCommentId || undefined}
          expandParentId={targetParentId || undefined}
        />
      </div>

      <PostShareModal postId={post.id} isOpen={showShareModal} onClose={() => setShowShareModal(false)} />

      {reportTarget ? (
        <ReportModal targetId={reportTarget.id} targetType={reportTarget.type} onClose={() => setReportTarget(null)} />
      ) : null}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Xóa bài viết"
        description="Bài viết sẽ bị xóa khỏi hồ sơ và bảng tin. Hành động này không thể hoàn tác trong giao diện."
        confirmLabel="Xóa bài viết"
        variant="danger"
        isLoading={isDeleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          void handleDelete();
        }}
      />
    </article>
  );
}, (prev, next) => prev.post.id === next.post.id);
