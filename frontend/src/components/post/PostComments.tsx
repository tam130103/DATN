import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Comment } from '../../types';
import { engagementService } from '../../services/engagement.service';
import { CommentItem } from '../CommentItem';
import { useAuth } from '../../contexts/AuthContext';

interface PostCommentsProps {
  postId: string;
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  showComments: boolean;
  onReport: (id: string) => void;
  highlightCommentId?: string;
  expandParentId?: string;
}

export const PostComments: React.FC<PostCommentsProps> = ({
  postId,
  comments,
  setComments,
  showComments,
  onReport,
  highlightCommentId,
  expandParentId,
}) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!showComments) return null;

  const handleReplyClick = (comment: Comment) => {
    setReplyTarget(comment);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCancelReply = () => {
    setReplyTarget(null);
    setCommentText('');
  };

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    if (replyTarget?.id.startsWith('temp-')) {
      toast.error('Vui lòng đợi bình luận được lưu trước khi trả lời.');
      return;
    }
    const content = commentText.trim();
    const parentId = replyTarget?.id;
    // Backend flattens replies to root, so resolve the root comment ID
    const rootCommentId = replyTarget?.parentId || replyTarget?.id;
    setCommentText('');

    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      content,
      postId,
      userId: user?.id || '',
      user: user ?? undefined,
      parentId: rootCommentId || null,
      replyToUserId: replyTarget?.userId,
      replyToUser: replyTarget?.user,
      createdAt: new Date().toISOString(),
    } as any;

    if (rootCommentId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === rootCommentId
            ? {
                ...c,
                repliesCount: (c.repliesCount || 0) + 1,
                replies: [...(c.replies || []), optimisticComment],
              }
            : c,
        ),
      );
    } else {
      setComments((prev) => [optimisticComment, ...prev]);
    }

    try {
      const newComment = await engagementService.createComment(postId, content, parentId, replyTarget?.userId);
      if (rootCommentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === rootCommentId
              ? {
                  ...c,
                  replies: (c.replies || []).map((r) =>
                    r.id === optimisticComment.id ? { ...newComment, user: newComment.user ?? optimisticComment.user } : r
                  ),
                }
              : c,
          ),
        );
      } else {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === optimisticComment.id
              ? { ...newComment, user: newComment.user ?? optimisticComment.user }
              : comment,
          ),
        );
      }
      setReplyTarget(null);
    } catch {
      if (rootCommentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === rootCommentId
              ? {
                  ...c,
                  repliesCount: Math.max(0, (c.repliesCount || 1) - 1),
                  replies: (c.replies || []).filter((r) => r.id !== optimisticComment.id),
                }
              : c,
          ),
        );
      } else {
        setComments((prev) => prev.filter((comment) => comment.id !== optimisticComment.id));
      }
      toast.error('Không thể thêm bình luận.');
    }
  };

  return (
    <>
      <div className="mt-3 space-y-2 border-t border-[var(--app-border)]/40 pt-3">
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--app-muted)] italic">Chưa có bình luận nào.</p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              onDeleted={(id) => setComments((prev) => prev.filter((c) => c.id !== id))}
              onReport={onReport}
              onReplyClick={handleReplyClick}
              postId={postId}
              highlightCommentId={highlightCommentId}
              expandParentId={expandParentId}
            />
          ))
        )}
      </div>

      <form
        onSubmit={handleSubmitComment}
        className="relative mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--app-border)]/60 pt-3"
      >
        {replyTarget && (
          <div className="absolute -top-5 left-0 flex items-center gap-1 text-xs text-[var(--app-muted)]">
            <span>Trả lời <strong>@{replyTarget.user?.username || replyTarget.user?.name}</strong></span>
            <button
              type="button"
              onClick={handleCancelReply}
              className="ml-1 text-[var(--app-muted)] hover:text-[var(--app-text)]"
              aria-label="Hủy trả lời"
            >
              X
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={replyTarget ? `Trả lời @${replyTarget.user?.username || replyTarget.user?.name}...` : 'Thêm bình luận...'}
          autoComplete="off"
          spellCheck={false}
          className="min-h-[34px] flex-1 bg-transparent text-sm text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
          onKeyDown={(e) => {
            if (e.key === 'Escape' && replyTarget) {
              handleCancelReply();
            }
          }}
        />
        {commentText.trim() ? (
          <button
            type="submit"
            className="text-sm font-bold text-[var(--app-primary)] transition hover:text-[var(--app-primary-strong)]"
          >
            Đăng
          </button>
        ) : null}
      </form>
    </>
  );
};
