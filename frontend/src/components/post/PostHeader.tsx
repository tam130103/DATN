import React from 'react';
import { Link } from 'react-router-dom';
import {
  DotsThree,
  PencilSimple,
  PushPin,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react';
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
  const iconBoxClass =
    'flex h-10 w-10 items-center justify-center rounded-full bg-[var(--app-bg-soft)] text-[var(--app-text)]';

  return (
    <>
      {isPinned && isOwner ? (
        <div className="flex items-center gap-1.5 px-3 pt-2.5 text-[11px] font-semibold text-[var(--app-muted)]">
          <PushPin size={14} weight="fill" aria-hidden="true" />
          <span>Đã ghim</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <Link
          to={profilePath}
          className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
        >
          <Avatar src={avatarUrl} name={name} username={username} size="sm" ring />
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
            className="interactive-icon spring-ease inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--app-text)] hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)] disabled:opacity-50"
            aria-label="Tùy chọn bài viết"
          >
            <DotsThree size={22} weight="bold" aria-hidden="true" />
          </button>

          {showOptionsDropdown ? (
            <>
              <button
                type="button"
                aria-label="Đóng menu tùy chọn"
                className="fixed inset-0 z-[60] cursor-default"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowOptionsDropdown(false);
                }}
              />
              <div className="absolute right-0 top-full z-[70] mt-1 w-[320px] rounded-xl bg-[var(--app-bg)] p-3 shadow-[0_8px_30px_rgba(28,30,33,0.12)] ring-1 ring-[var(--app-border)]">
                {isOwner ? (
                  <>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowOptionsDropdown(false);
                        onTogglePin?.();
                      }}
                      className="spring-ease flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                    >
                      <div className={iconBoxClass}>
                        <PushPin size={20} weight={isPinned ? 'fill' : 'regular'} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">
                          {isPinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}
                        </div>
                        <div className="text-xs text-[var(--app-muted)]">
                          {isPinned
                            ? 'Gỡ bài này khỏi đầu trang cá nhân của bạn.'
                            : 'Đưa bài này lên đầu trang cá nhân của bạn.'}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowOptionsDropdown(false);
                        onEdit?.();
                      }}
                      className="spring-ease flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                    >
                      <div className={iconBoxClass}>
                        <PencilSimple size={20} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">Chỉnh sửa bài viết</div>
                        <div className="text-xs text-[var(--app-muted)]">Cập nhật nội dung văn bản.</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowOptionsDropdown(false);
                        onDelete?.();
                      }}
                      className="spring-ease flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                    >
                      <div className={iconBoxClass}>
                        <Trash size={20} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--app-danger)]">Xóa bài viết</div>
                        <div className="text-xs text-[var(--app-muted)]">
                          Gỡ bài viết này khỏi dòng thời gian.
                        </div>
                      </div>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowOptionsDropdown(false);
                      onReport?.();
                    }}
                    className="spring-ease flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                  >
                    <div className={iconBoxClass}>
                      <WarningCircle size={20} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--app-text)]">Báo cáo bài viết</div>
                      <div className="text-xs text-[var(--app-muted)]">
                        Chúng tôi sẽ không cho {displayName} biết ai đã báo cáo.
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
};
