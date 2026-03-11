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
    const sender = notification.sender.name || notification.sender.username || 'Someone';
    switch (notification.type) {
      case 'LIKE':
        return `${sender} liked your post`;
      case 'COMMENT':
        return `${sender} commented on your post`;
      case 'FOLLOW':
        return `${sender} started following you`;
      default:
        return 'New activity';
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/90 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900"
        aria-label="Open notifications"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 5a4 4 0 00-4 4v2.2c0 .6-.2 1.1-.6 1.6l-1.1 1.3a1 1 0 00.8 1.7h10a1 1 0 00.8-1.7l-1.1-1.3a2.4 2.4 0 01-.6-1.6V9a4 4 0 00-4-4z" />
          <path d="M10 18a2 2 0 004 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-semibold text-white shadow-lg">
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
            aria-label="Close notifications"
          />
          <div className="absolute right-0 top-14 z-20 w-[360px] overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.42)] backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Realtime</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Notifications</h3>
              </div>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Mark all read
                </button>
              ) : null}
            </div>

            <div className="max-h-[420px] overflow-y-auto px-3 py-3">
              {isLoading ? (
                <div className="rounded-[24px] bg-slate-50 p-6 text-center text-sm text-slate-500">Loading alerts...</div>
              ) : notifications.length === 0 ? (
                <div className="rounded-[24px] bg-slate-50 p-6 text-center text-sm text-slate-500">No notifications yet.</div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleMarkAsRead(notification.id, notification.isRead)}
                      className={`w-full rounded-[24px] border px-4 py-3 text-left transition ${
                        notification.isRead
                          ? 'border-transparent bg-transparent hover:bg-slate-50'
                          : 'border-cyan-100 bg-cyan-50/70 hover:bg-cyan-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar
                          src={notification.sender.avatarUrl}
                          name={notification.sender.name}
                          username={notification.sender.username}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-6 text-slate-900">
                            {renderNotificationText(notification)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notification.isRead ? <span className="mt-2 h-2.5 w-2.5 rounded-full bg-cyan-500" /> : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="block rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-200 hover:text-slate-900"
              >
                Open notifications center
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
