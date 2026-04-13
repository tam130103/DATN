import React, { useState } from 'react';
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
}

export const PostComments: React.FC<PostCommentsProps> = ({
  postId,
  comments,
  setComments,
  showComments,
  onReport
}) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');

  if (!showComments) return null;

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    const content = commentText.trim();
    setCommentText('');

    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      content,
      postId,
      userId: user?.id || '',
      user: user ?? undefined,
      createdAt: new Date().toISOString(),
    } as any;

    setComments((prev) => [optimisticComment, ...prev]);

    try {
      const newComment = await engagementService.createComment(postId, content);
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
            />
          ))
        )}
      </div>

      <form
        onSubmit={handleSubmitComment}
        className="mt-3 flex items-center gap-3 border-t border-[var(--app-border)]/60 pt-3"
      >
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Thêm bình luận..."
          className="min-h-[34px] flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none"
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
