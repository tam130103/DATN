import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notification.service';
import { Notification } from '../types';
import { Avatar } from './common/Avatar';

export const NotificationBell: React.FC = () => {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    notificationService.connect(token);

    const unsubscribeCount = notificationService.on('unreadCount', (count: number) => {
      setUnreadCount(count);
    });

    const unsubscribeNotification = notificationService.on('notification', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 10));
      setUnreadCount((prev) => prev + 1);
    });

    notificationService.getUnreadCount().then(setUnreadCount).catch(() => undefined);

    return () => {
      unsubscribeCount();
      unsubscribeNotification();
      notificationService.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const data = await notificationService.getNotifications(1, 10);
        setNotifications(data);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: string, alreadyRead: boolean) => {
    if (alreadyRead) return;

    await notificationService.markAsReadHttp(notificationId);
    notificationService.markAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsReadHttp();
    notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
    setUnreadCount(0);
  };

  const renderNotificationText = (notification: Notification) => {
    const sender = notification.sender.name || notification.sender.username || 'Ai đó';
    switch (notification.type) {
      case 'LIKE':
        return `${sender} đã thích bài viết của bạn`;
      case 'COMMENT':
        return `${sender} đã bình luận về bài viết của bạn`;
      case 'FOLLOW':
        return `${sender} đã bắt đầu theo dõi bạn`;
      default:
        return 'Hoạt động mới';
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-[var(--app-surface)] text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-900"
        aria-label="Mở thông báo"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 5a4 4 0 00-4 4v2.2c0 .6-.2 1.1-.6 1.6l-1.1 1.3a1 1 0 00.8 1.7h10a1 1 0 00.8-1.7l-1.1-1.3a2.4 2.4 0 01-.6-1.6V9a4 4 0 00-4-4z" />
          <path d="M10 18a2 2 0 004 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default bg-transparent"
            onClick={() => setIsOpen(false)}
            aria-label="Đóng thông báo"
          />
          <div className="absolute right-0 top-12 z-20 w-[340px] overflow-hidden rounded-xl border border-neutral-200 bg-[var(--app-surface)] shadow-lg">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-neutral-900">Thông báo</h3>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-semibold text-blue-500"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              ) : null}
            </div>

            <div className="max-h-[420px] overflow-y-auto px-3 py-3">
              {isLoading ? (
                <div className="rounded-lg bg-neutral-50 p-4 text-center text-xs text-neutral-500">Đang tải...</div>
              ) : notifications.length === 0 ? (
                <div className="rounded-lg bg-neutral-50 p-4 text-center text-xs text-neutral-500">Chưa có thông báo nào.</div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleMarkAsRead(notification.id, notification.isRead)}
                      className={`w-full rounded-lg px-3 py-2 text-left transition ${
                        notification.isRead
                          ? 'bg-transparent hover:bg-neutral-50'
                          : 'bg-blue-50/60 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar
                          src={notification.sender.avatarUrl}
                          name={notification.sender.name}
                          username={notification.sender.username}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-neutral-900">
                            {renderNotificationText(notification)}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notification.isRead ? <span className="mt-2 h-2 w-2 rounded-full bg-blue-500" /> : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-neutral-200 px-4 py-3">
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center text-sm font-medium text-neutral-700 hover:text-neutral-900"
              >
                Xem tất cả
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
