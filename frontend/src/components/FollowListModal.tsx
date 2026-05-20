import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Avatar } from './common/Avatar';
import { CloseIcon, SearchIcon } from './common/Icons';
import { userService } from '../services/user.service';
import { User } from '../types';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  userId: string;
  mode: 'followers' | 'following';
  currentUserId?: string;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  onClose,
  title,
  userId,
  mode,
  currentUserId,
}) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<(User & { isFollowing?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data =
        mode === 'followers'
          ? await userService.getFollowers(userId, 1, 100)
          : await userService.getFollowing(userId, 1, 100);
      setUsers(data);
    } catch {
      toast.error('Không thể tải danh sách.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, mode]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSearchQuery('');
    }
  }, [isOpen, fetchUsers]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.name || '').toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  const handleToggleFollow = async (targetUser: User & { isFollowing?: boolean }) => {
    if (targetUser.id === currentUserId) return;
    setTogglingIds((prev) => new Set(prev).add(targetUser.id));
    const wasFollowing = targetUser.isFollowing;
    // Optimistic update
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUser.id ? { ...u, isFollowing: !wasFollowing } : u,
      ),
    );
    try {
      if (wasFollowing) {
        await userService.unfollowUser(targetUser.id);
      } else {
        await userService.followUser(targetUser.id);
      }
    } catch {
      // Revert
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, isFollowing: wasFollowing } : u,
        ),
      );
      toast.error('Không thể cập nhật.');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUser.id);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[rgba(28,30,33,0.72)]" />

      {/* Modal */}
      <div
        className="relative flex max-h-[min(400px,80vh)] w-full max-w-[400px] flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-3">
          <div className="w-9" />
          <h3 className="text-base font-semibold text-[var(--app-text)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)]"
            aria-label="Đóng danh sách"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-[var(--app-border)] px-4 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-[var(--app-bg-soft)] px-3 py-2">
            <span className="text-[var(--app-muted)]">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm"
              className="flex-1 bg-transparent text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
              name="follow-search"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--app-primary)] border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[var(--app-muted)]">
              {searchQuery.trim() ? 'Không tìm thấy kết quả.' : 'Chưa có ai.'}
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((u) => {
                const isSelf = u.id === currentUserId;

                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--app-bg-soft)]"
                  >
                    {/* Avatar – clickable */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate(`/${u.username ?? u.id}`);
                      }}
                      className="flex-shrink-0"
                    >
                      <Avatar
                        src={u.avatarUrl}
                        name={u.name}
                        username={u.username}
                        size="md"
                      />
                    </button>

                    {/* Name – clickable */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate(`/${u.username ?? u.id}`);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                          {u.username || u.name}
                        </p>
                        {!isSelf && u.isFollowing === false && mode === 'followers' ? (
                          <span className="text-xs text-[var(--app-primary)]">· Theo dõi</span>
                        ) : null}
                      </div>
                      {u.name && u.name !== u.username ? (
                        <p className="truncate text-sm text-[var(--app-muted)]">{u.name}</p>
                      ) : null}
                    </button>

                    {/* Action button */}
                    {!isSelf ? (
                        <button
                          type="button"
                          onClick={() => handleToggleFollow(u)}
                          disabled={togglingIds.has(u.id)}
                          className={`inline-flex min-h-[32px] items-center justify-center rounded-lg px-4 text-sm font-semibold transition disabled:opacity-50 ${
                            u.isFollowing
                              ? 'bg-[var(--app-bg-soft)] text-[var(--app-text)] hover:bg-[var(--app-border)]'
                              : 'bg-[var(--app-primary)] text-white hover:bg-[var(--app-primary-strong)]'
                          }`}
                        >
                          {u.isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                        </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
