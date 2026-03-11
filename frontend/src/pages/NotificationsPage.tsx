import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { Avatar } from '../components/common/Avatar';
import { StatePanel } from '../components/common/StatePanel';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notification.service';
import { userService } from '../services/user.service';
import { Notification } from '../types';

const NotificationsPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const data = await notificationService.getNotifications();
        setNotifications(data);
      } catch {
        toast.error('Failed to load notifications.');
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, [user]);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsReadHttp();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      toast.success('All notifications marked as read.');
    } catch {
      toast.error('Failed to mark notifications.');
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsReadHttp(notificationId);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item)),
      );
    } catch {
      toast.error('Failed to update notification.');
    }
  };

  const toggleNotifications = async () => {
    const nextValue = !(user?.notificationEnabled ?? true);
    try {
      await userService.updateNotificationSettings(nextValue);
      updateUser((previous) => (previous ? { ...previous, notificationEnabled: nextValue } : previous));
      toast.success(nextValue ? 'Notifications enabled.' : 'Notifications disabled.');
    } catch {
      toast.error('Failed to update notification settings.');
    }
  };

  const aside = (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Settings</p>
        <h3 className="mt-3 text-xl font-semibold text-slate-900">Delivery preference</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Control whether likes, comments, and follows should generate alerts for your account.
        </p>
        <button
          type="button"
          onClick={toggleNotifications}
          className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            user?.notificationEnabled !== false
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {user?.notificationEnabled !== false ? 'Notifications enabled' : 'Notifications disabled'}
        </button>
      </div>

      <div className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Summary</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Unread</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{unreadCount}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Total</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{notifications.length}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      title="Notifications"
      description="A single place to review reactions, comments, and follow activity around your account."
      action={
        unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Mark all read
          </button>
        ) : undefined
      }
      aside={aside}
    >
      {isLoading ? (
        <StatePanel title="Alerts" description="Loading the latest notification activity." />
      ) : notifications.length === 0 ? (
        <StatePanel title="Quiet" description="No notifications yet. New activity will appear here." />
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleMarkAsRead(notification.id)}
              className={`w-full rounded-[32px] border px-5 py-4 text-left shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur transition lg:px-6 ${
                notification.isRead
                  ? 'border-white/70 bg-white/82 hover:bg-white'
                  : 'border-cyan-100 bg-cyan-50/70 hover:bg-cyan-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <Avatar src={notification.sender.avatarUrl} name={notification.sender.name} username={notification.sender.username} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-7 text-slate-700">
                    <span className="font-semibold text-slate-900">
                      {notification.sender.username ? `@${notification.sender.username}` : notification.sender.name || 'Someone'}
                    </span>{' '}
                    {notification.type === 'LIKE' && 'liked your post.'}
                    {notification.type === 'COMMENT' && 'commented on your post.'}
                    {notification.type === 'FOLLOW' && 'started following you.'}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.25em] text-slate-400">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                {!notification.isRead ? <span className="mt-3 h-2.5 w-2.5 rounded-full bg-cyan-500" /> : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default NotificationsPage;
