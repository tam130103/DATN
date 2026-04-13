import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../common/Avatar';
import { User } from '../../types';

interface PostHeaderProps {
  user?: User;
  createdAt: string | Date;
  isEdited?: boolean;
  isPinned?: boolean;
  isOwner?: boolean;
  onTogglePin?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  showOptionsDropdown: boolean;
  setShowOptionsDropdown: (show: boolean) => void;
  isDeleting?: boolean;
}

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

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="6" cy="12" r="1.5" />
    <circle cx="18" cy="12" r="1.5" />
  </svg>
);

export const PostHeader: React.FC<PostHeaderProps> = ({
  user,
  createdAt,
  isEdited,
  isPinned,
  isOwner,
  onTogglePin,
  onEdit,
  onDelete,
  onReport,
  showOptionsDropdown,
  setShowOptionsDropdown,
  isDeleting,
}) => {
  const profilePath = user ? `/${user.username || user.id}` : '#';
  const displayName = user?.username || user?.name || 'user';
  const avatarUrl = user?.avatarUrl;
  const name = user?.name;
  const username = user?.username;

  return (
    <>
      {isPinned && isOwner && (
        <div className="flex items-center gap-1 px-3 pt-2.5 text-[11px] font-semibold text-[var(--app-muted)]">
          📌 Đã ghim
        </div>
      )}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <Link to={profilePath} className="flex min-w-0 items-center gap-2">
          <Avatar
            src={avatarUrl}
            name={name}
            username={username}
            size="sm"
            ring
          />
          <div className="min-w-0 leading-tight">
            <span className="text-sm font-semibold text-[var(--app-text)]">{displayName}</span>
            <span className="mx-1 text-xs text-[var(--app-muted)]">·</span>
            <span className="text-xs text-[var(--app-muted)]">
              {timeAgo(createdAt)}
              {isEdited ? ' · Đã sửa' : ''}
            </span>
          </div>
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
            disabled={isDeleting}
            className="interactive-icon inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)] disabled:opacity-50"
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
              <div className="absolute right-0 top-full z-[70] mt-1 w-[320px] rounded-xl bg-[var(--app-bg)] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-gray-200">
                {isOwner ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOptionsDropdown(false);
                        onTogglePin?.();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">{isPinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}</div>
                        <div className="text-xs text-[var(--app-muted)]">{isPinned ? 'Gỡ bài này khỏi màn hình Profile của bạn.' : 'Đưa bài này lên đầu trang cá nhân của bạn.'}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOptionsDropdown(false);
                        onEdit?.();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">Chỉnh sửa bài viết</div>
                        <div className="text-xs text-[var(--app-muted)]">Cập nhật nội dung văn bản.</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOptionsDropdown(false);
                        onDelete?.();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--app-text)] text-red-600">Xóa bài viết</div>
                        <div className="text-xs text-[var(--app-muted)]">Gỡ bài viết này khỏi dòng thời gian.</div>
                      </div>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOptionsDropdown(false);
                        onReport?.();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">Báo cáo bài viết</div>
                        <div className="text-xs text-[var(--app-muted)]">Chúng tôi sẽ không cho {displayName} biết ai đã báo cáo.</div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};
