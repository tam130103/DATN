import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notification.service';
import { userService } from '../services/user.service';
import { Notification } from '../types';
import toast from 'react-hot-toast';

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) return;
      try {
        const data = await notificationService.getNotifications();
        setNotifications(data);
      } catch {
        toast.error('Failed to load notifications');
      }
    };

    loadNotifications();
  }, [user]);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Notifications</h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-blue-500 hover:underline text-sm"
          >
            {showSettings ? 'Done' : 'Settings'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {showSettings ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Notification Settings</h2>
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Allow Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications when someone interacts with you</p>
              </div>
              <button
                onClick={async () => {
                  const newValue = !user?.notificationEnabled ?? true;
                  await userService.updateNotificationSettings(newValue);
                  toast.success(newValue ? 'Notifications enabled' : 'Notifications disabled');
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  user?.notificationEnabled !== false
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {user?.notificationEnabled !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">All Notifications</h2>
              {notifications.some((n) => !n.isRead) && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-blue-500 hover:underline text-sm"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-600">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleMarkAsRead(notification.id)}
                    className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {notification.sender.avatarUrl ? (
                        <img
                          src={notification.sender.avatarUrl}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500">
                            {(notification.sender.name || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">
                          {notification.type === 'LIKE' && `${notification.sender.name || 'Someone'} liked your post`}
                          {notification.type === 'COMMENT' && `${notification.sender.name || 'Someone'} commented on your post`}
                          {notification.type === 'FOLLOW' && `${notification.sender.name || 'Someone'} started following you`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
