import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
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

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

export const PostShareModal: React.FC<PostShareModalProps> = ({ postId, isOpen, onClose }) => {
  const { user } = useAuth();
  const [shareFollowing, setShareFollowing] = useState<User[]>([]);
  const [shareQuery, setShareQuery] = useState('');
  const [selectedShareUsers, setSelectedShareUsers] = useState<Set<string>>(new Set());
  const [isSendingShare, setIsSendingShare] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id && shareFollowing.length === 0) {
      setIsLoading(true);
      userService.getFollowing(user.id, 1, 50)
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
      next.has(id) ? next.delete(id) : next.add(id);
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

  const filteredShareUsers = shareFollowing.filter(
    (u) =>
      !shareQuery.trim() ||
      (u.username || '').toLowerCase().includes(shareQuery.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(shareQuery.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="surface-card flex w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-2xl h-[480px]">
        <div className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4">
          <p className="text-base font-bold text-[var(--app-text)]">Chia sẻ bài viết</p>
          <button
            type="button"
            onClick={onClose}
            className="interactive-icon inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[var(--app-bg-soft)]"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-3 py-2.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--app-muted)]" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              autoFocus
              value={shareQuery}
              onChange={(e) => setShareQuery(e.target.value)}
              placeholder="Tìm kiếm bạn bè..."
              className="flex-1 bg-transparent text-[14px] text-[var(--app-text)] outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {filteredShareUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-10 opacity-50">
              <p className="text-sm text-[var(--app-muted)] text-center">
                {isLoading ? 'Đang tải danh sách...' : 'Không tìm thấy kết quả.'}
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
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-[var(--app-bg-soft)]"
                  >
                    <Avatar src={shareUser.avatarUrl} name={shareUser.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-[var(--app-text)]">
                        {shareUser.username || shareUser.name}
                      </p>
                      {shareUser.name && <p className="truncate text-xs text-[var(--app-muted)]">{shareUser.name}</p>}
                    </div>
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                        isSelected ? 'border-[var(--app-primary)] bg-[var(--app-primary)] text-white' : 'border-[var(--app-border)] text-transparent'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
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
            className="btn-primary w-full py-2.5 rounded-xl font-bold transition-all disabled:opacity-40"
          >
            {isSendingShare ? 'Đang gửi...' : `Gửi${selectedShareUsers.size > 0 ? ` (${selectedShareUsers.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};
