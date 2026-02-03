import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notification.service';
import { Notification } from '../types';
import { apiClient } from '../services/api';

export const NotificationBell: React.FC = () => {
  const { user, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!token) return;

    // Connect to socket
    notificationService.connect(token);

    // Listen for unread count updates
    const unsubscribeCount = notificationService.on('unreadCount', (count: number) => {
      setUnreadCount(count);
    });

    // Listen for new notifications
    const unsubscribeNotif = notificationService.on('notification', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      try {
        const response = await apiClient.get<number>('/notifications/unread-count');
        setUnreadCount(response.data);
      } catch {
        console.error('Failed to fetch unread count');
      }
    };

    fetchUnreadCount();

    return () => {
      unsubscribeCount();
      unsubscribeNotif();
    };
  }, [token]);

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user]);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get<Notification[]>('/notifications', {
        params: { limit: 10 },
      });
      setNotifications(response.data);
    } catch {
      console.error('Failed to fetch notifications');
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const getNotificationText = (notification: Notification) => {
    const senderName = notification.sender.username
      ? `@${notification.sender.username}`
      : notification.sender.name || 'Someone';

    switch (notification.type) {
      case 'LIKE':
        return `${senderName} liked your post`;
      case 'COMMENT':
        return `${senderName} commented on your post`;
      case 'FOLLOW':
        return `${senderName} started following you`;
      default:
        return 'New notification';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl z-20 max-h-96 overflow-hidden flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-500 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No notifications</p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleMarkAsRead(notification.id)}
                    className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {notification.sender.avatarUrl ? (
                        <img
                          src={notification.sender.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm text-gray-500">
                            {(notification.sender.name || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm">{getNotificationText(notification)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-2 border-t">
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center text-sm text-blue-500 hover:underline"
              >
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
