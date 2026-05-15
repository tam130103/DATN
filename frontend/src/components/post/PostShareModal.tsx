import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, MagnifyingGlass, X } from '@phosphor-icons/react';
import { User } from '../../types';
import { userService } from '../../services/user.service';
import { chatService } from '../../services/chat.service';
import { Avatar } from '../common/Avatar';
import { useAuth } from '../../contexts/AuthContext';

interface PostShareModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PostShareModal: React.FC<PostShareModalProps> = ({ postId, isOpen, onClose }) => {
  const { user } = useAuth();
  const [shareFollowing, setShareFollowing] = useState<User[]>([]);
  const [shareQuery, setShareQuery] = useState('');
  const [selectedShareUsers, setSelectedShareUsers] = useState<Set<string>>(new Set());
  const [isSendingShare, setIsSendingShare] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && user?.id && shareFollowing.length === 0) {
      setIsLoading(true);
      userService
        .getFollowing(user.id, 1, 50)
        .then(setShareFollowing)
        .catch(() => toast.error('Không thể tải danh sách đang theo dõi.'))
        .finally(() => setIsLoading(false));
    }
    if (!isOpen) {
      setShareQuery('');
      setSelectedShareUsers(new Set());
    }
  }, [isOpen, user?.id, shareFollowing.length]);

  if (!isOpen) return null;

  const toggleShareUser = (id: string) => {
    setSelectedShareUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendShare = async () => {
    if (selectedShareUsers.size === 0) return;
    const postUrl = `${window.location.origin}/posts/${postId}`;
    const message = `Check out this post: ${postUrl}`;
    setIsSendingShare(true);
    try {
      await Promise.all(
        Array.from(selectedShareUsers).map(async (userId) => {
          const conversation = await chatService.createConversation({ participantIds: [userId] });
          await chatService.sendMessage(conversation.id, message);
        }),
      );
      toast.success(`Đã chia sẻ cho ${selectedShareUsers.size} người.`);
      onClose();
    } catch {
      toast.error('Gửi thất bại. Vui lòng thử lại.');
    } finally {
      setIsSendingShare(false);
    }
  };

  const normalizedQuery = shareQuery.toLowerCase();
  const filteredShareUsers = shareFollowing.filter(
    (nextUser) =>
      !shareQuery.trim() ||
      (nextUser.username || '').toLowerCase().includes(normalizedQuery) ||
      (nextUser.name || '').toLowerCase().includes(normalizedQuery),
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(28,30,33,0.72)] p-4 backdrop-blur-md [overscroll-behavior:contain]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className="surface-card flex h-[480px] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4">
          <p id="share-title" className="text-base font-bold text-[var(--app-text)]">
            Chia sẻ bài viết
          </p>
          <button
            type="button"
            onClick={onClose}
            className="interactive-icon spring-ease inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
            aria-label="Đóng chia sẻ"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="px-4 py-4">
          <label className="flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-3 py-2.5">
            <MagnifyingGlass size={16} className="text-[var(--app-muted)]" aria-hidden="true" />
            <span className="sr-only">Tìm kiếm bạn bè để chia sẻ</span>
            <input
              autoFocus
              value={shareQuery}
              onChange={(event) => setShareQuery(event.target.value)}
              placeholder="Tìm kiếm bạn bè..."
              className="flex-1 bg-transparent text-[14px] text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
              name="share-search"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {filteredShareUsers.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-10 opacity-70">
              <p className="text-center text-sm text-[var(--app-muted)]">
                {isLoading ? 'Đang tải danh sách…' : 'Không tìm thấy kết quả.'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 px-1">
              {filteredShareUsers.map((shareUser) => {
                const isSelected = selectedShareUsers.has(shareUser.id);
                return (
                  <button
                    key={shareUser.id}
                    type="button"
                    onClick={() => toggleShareUser(shareUser.id)}
                    className="spring-ease flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                  >
                    <Avatar src={shareUser.avatarUrl} name={shareUser.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-[var(--app-text)]">
                        {shareUser.username || shareUser.name}
                      </p>
                      {shareUser.name ? (
                        <p className="truncate text-xs text-[var(--app-muted)]">{shareUser.name}</p>
                      ) : null}
                    </div>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border spring-ease ${
                        isSelected
                          ? 'border-[var(--app-primary)] bg-[var(--app-primary)] text-white'
                          : 'border-[var(--app-border)] text-transparent'
                      }`}
                    >
                      <Check size={12} weight="bold" aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--app-border)] p-4">
          <button
            type="button"
            onClick={handleSendShare}
            disabled={selectedShareUsers.size === 0 || isSendingShare}
            className="btn-primary btn-tactile spring-ease w-full rounded-xl py-2.5 font-bold disabled:opacity-40"
          >
            {isSendingShare ? 'Đang gửi…' : `Gửi${selectedShareUsers.size > 0 ? ` (${selectedShareUsers.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};
