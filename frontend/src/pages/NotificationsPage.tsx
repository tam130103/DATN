import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { Avatar } from '../components/common/Avatar';
import { StatePanel } from '../components/common/StatePanel';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notification.service';
import { Notification } from '../types';

function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    notificationService.getNotifications()
      .then((data) => {
        setNotifications(data);
        if (data.some((n) => !n.isRead)) {
          notificationService.markAllAsRead();
          notificationService.markAllAsReadHttp()
            .then(() => setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true }))))
            .catch(() => {});
        }
      })
      .catch(() => toast.error('Failed to load notifications.'))
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsReadHttp();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      toast.error('Failed to mark notifications.');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsReadHttp(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      toast.error('Failed to update notification.');
    }
  };

  const notificationText = (type: string) => {
    if (type === 'LIKE') return 'liked your photo.';
    if (type === 'COMMENT') return 'commented: ';
    if (type === 'FOLLOW') return 'started following you.';
    return 'interacted with your post.';
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[614px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4">
          <h2 className="text-base font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead} className="text-sm font-semibold text-[#0095f6]">
              Mark all as read
            </button>
          )}
        </div>

        {isLoading ? (
          <StatePanel title="Loading" description="Loading your notifications..." />
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 text-5xl">🔔</div>
            <p className="font-semibold text-[#262626]">Activity On Your Posts</p>
            <p className="mt-1 text-sm text-[#8e8e8e]">
              When someone likes or comments on one of your posts, you'll see it here.
            </p>
          </div>
        ) : (
          <div>
            {/* Earlier section */}
            <p className="px-4 pb-2 text-sm font-semibold text-[#262626]">Earlier</p>
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleMarkAsRead(notification.id)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-[#fafafa] ${
                  !notification.isRead ? 'bg-[#eff6ff]' : ''
                }`}
              >
                <Avatar
                  src={notification.sender.avatarUrl}
                  name={notification.sender.name}
                  username={notification.sender.username}
                  size="md"
                />
                <p className="flex-1 text-sm leading-5">
                  <span className="font-semibold">
                    {notification.sender.username || notification.sender.name || 'Someone'}
                  </span>{' '}
                  {notificationText(notification.type)}
                  <span className="ml-1 text-[#8e8e8e]">{timeAgo(notification.createdAt)}</span>
                </p>
                {!notification.isRead && (
                  <div className="h-2 w-2 flex-shrink-0 rounded-full bg-[#0095f6]" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default NotificationsPage;
