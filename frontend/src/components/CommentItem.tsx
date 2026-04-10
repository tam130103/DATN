import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Comment } from '../types';
import { Avatar } from './common/Avatar';
import { engagementService } from '../services/engagement.service';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  onDeleted: (commentId: string) => void;
  onReport: (commentId: string) => void;
  onHide: (commentId: string) => void;
}

const DotsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </svg>
);

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onDeleted,
  onReport,
  onHide,
}) => {
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localContent, setLocalContent] = useState(comment.content);

  const isOwner = currentUserId === comment.userId;
  const authorLabel = comment.user?.username || comment.user?.name || 'Thành viên';

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

  return (
    <div id={`comment-${comment.id}`} className="group relative flex items-start gap-3 rounded-lg p-2 transition hover:bg-[var(--app-bg-soft)]">
      <Avatar
        src={comment.user?.avatarUrl}
        name={comment.user?.name}
        username={comment.user?.username}
        size="sm"
      />
      
      <div className="min-w-0 flex-1 text-sm leading-6 text-[var(--app-text)]">
        <span className="mr-2 font-semibold text-[var(--app-text)]">
          {authorLabel}
        </span>
        
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
          <span className="whitespace-pre-wrap">{localContent}</span>
        )}
      </div>

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
                        onHide(comment.id);
                      }}
                      className="w-full px-4 py-2 text-left text-sm font-medium text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]"
                    >
                      Ẩn bình luận
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
  );
};
