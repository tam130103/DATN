import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { Avatar } from '../components/common/Avatar';
import { StatePanel } from '../components/common/StatePanel';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notification.service';
import { Notification } from '../types';

function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}p`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}g`;
  return `${Math.floor(hours / 24)}n`;
}

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-1.834-1.527-4.303-3.752C5.152 14.08 2.5 12.194 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z" />
  </svg>
);

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M20.656 17.008a9.993 9.993 0 10-3.59 3.615L22 22z" strokeLinejoin="round" />
  </svg>
);

const FollowIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);

const iconForType = (type: string) => {
  if (type === 'LIKE') return <HeartIcon />;
  if (type === 'COMMENT') return <CommentIcon />;
  return <FollowIcon />;
};

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );
  const unreadNotifications = notifications.filter((notification) => !notification.isRead);
  const readNotifications = notifications.filter((notification) => notification.isRead);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    notificationService
      .getNotifications()
      .then((data) => {
        setNotifications(data);
        if (data.some((notification) => !notification.isRead)) {
          notificationService.markAllAsRead();
          notificationService
            .markAllAsReadHttp()
            .then(() =>
              setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true }))),
            )
            .catch(() => {});
        }
      })
      .catch(() => toast.error('Không thể tải thông báo.'))
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsReadHttp();
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
    } catch {
      toast.error('Không thể đánh dấu thông báo.');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsReadHttp(id);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, isRead: true } : notification,
        ),
      );
    } catch {
      toast.error('Không thể cập nhật thông báo.');
    }
  };

  const notificationText = (notification: Notification) => {
    if (notification.type === 'LIKE') return 'đã thích bài viết của bạn.';
    if (notification.type === 'COMMENT') {
      const commentText =
        typeof notification.data?.content === 'string' ? ` "${notification.data.content}"` : '';
      return `đã bình luận về bài viết của bạn${commentText}.`;
    }
    if (notification.type === 'FOLLOW') return 'đã bắt đầu theo dõi bạn.';
    return 'đã tương tác với bài viết của bạn.';
  };

  const renderNotificationRow = (notification: Notification) => (
    <button
      key={notification.id}
      type="button"
      onClick={() => handleMarkAsRead(notification.id)}
      className={`flex w-full items-start gap-3 rounded-xl px-4 py-4 text-left transition hover:bg-[var(--app-bg-soft)] ${
        !notification.isRead ? 'bg-[#eef6ff]' : ''
      }`}
    >
      <Avatar
        src={notification.sender.avatarUrl}
        name={notification.sender.name}
        username={notification.sender.username}
        size="md"
        ring={!notification.isRead}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[var(--app-text)]">
            {notification.sender.username || notification.sender.name || 'Ai đó'}
          </span>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--app-bg-soft)] text-[var(--app-muted)]">
            {iconForType(notification.type)}
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--app-text)]">
          {notificationText(notification)}{' '}
          <span className="text-[var(--app-muted)]">{timeAgo(notification.createdAt)}</span>
        </p>
      </div>
      {!notification.isRead ? <div className="mt-2 h-2.5 w-2.5 rounded-full bg-[var(--app-primary)]" /> : null}
    </button>
  );

  const aside = (
    <div className="sticky top-6 space-y-4">
      <div className="surface-card rounded-xl p-5">
        <p className="text-base font-semibold text-[var(--app-text)]">Hoạt động</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[var(--app-bg-soft)] px-3 py-3">
            <p className="text-xs text-[var(--app-muted)]">Chưa đọc</p>
            <p className="mt-1 text-xl font-semibold text-[var(--app-text)]">{unreadCount}</p>
          </div>
          <div className="rounded-lg bg-[var(--app-bg-soft)] px-3 py-3">
            <p className="text-xs text-[var(--app-muted)]">Tổng cộng</p>
            <p className="mt-1 text-xl font-semibold text-[var(--app-text)]">
              {notifications.length}
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-xl p-5">
        <p className="text-base font-semibold text-[var(--app-text)]">Mẹo</p>
        <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--app-muted-strong)]">
          <p>Chưa đọc sẽ được tô màu xanh.</p>
          <p>Thông báo về theo dõi, thích và bình luận sẽ được gom chung một chỗ.</p>
          <p>Sử dụng trang chủ hoặc trang cá nhân để xem lại các hoạt động của bạn.</p>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      title="Thông báo"
      description="Nơi hiển thị các hoạt động như theo dõi, thích và bình luận mà không làm phiền bạn."
      action={
        unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="inline-flex min-h-[38px] items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)]"
          >
            Đánh dấu tất cả là đã đọc
          </button>
        ) : (
          <Link
            to="/feed"
            className="inline-flex min-h-[38px] items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)]"
          >
            Trở về Trang chủ
          </Link>
        )
      }
      aside={aside}
    >
      <div className="space-y-4">
        {isLoading ? (
          <StatePanel title="Đang tải" description="Đang tải thông báo của bạn..." />
        ) : notifications.length === 0 ? (
          <StatePanel
            title="Hoạt động"
            description="Khi có ai đó thích, bình luận hoặc theo dõi bạn, nó sẽ xuất hiện ở đây."
          />
        ) : (
          <>
            {unreadNotifications.length > 0 ? (
              <section className="surface-card rounded-xl p-3">
                <p className="px-2 pb-2 pt-1 text-sm font-semibold text-[var(--app-text)]">Mới</p>
                <div className="space-y-1">{unreadNotifications.map(renderNotificationRow)}</div>
              </section>
            ) : null}

            {readNotifications.length > 0 ? (
              <section className="surface-card rounded-xl p-3">
                <p className="px-2 pb-2 pt-1 text-sm font-semibold text-[var(--app-text)]">Trước đó</p>
                <div className="space-y-1">{readNotifications.map(renderNotificationRow)}</div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default NotificationsPage;
