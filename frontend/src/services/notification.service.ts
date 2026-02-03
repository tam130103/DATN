import { io, Socket } from 'socket.io-client';
import { Notification } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class NotificationService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<Function>>();

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(`${API_URL}/notifications`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Connected to notifications');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from notifications');
    });

    this.socket.on('notification', (notification: Notification) => {
      this.emit('notification', notification);
    });

    this.socket.on('unreadCount', (count: number) => {
      this.emit('unreadCount', count);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  markAsRead(notificationId: string) {
    this.socket?.emit('markAsRead', { notificationId });
  }

  markAllAsRead() {
    this.socket?.emit('markAllAsRead');
  }

  async getNotifications(page = 1, limit = 20): Promise<Notification[]> {
    const { apiClient } = await import('./api');
    const response = await apiClient.get<Notification[]>('/notifications', {
      params: { page, limit },
    });
    return response.data;
  }

  async markAsReadHttp(notificationId: string): Promise<void> {
    const { apiClient } = await import('./api');
    await apiClient.post(`/notifications/${notificationId}/read`);
  }

  async markAllAsReadHttp(): Promise<void> {
    const { apiClient } = await import('./api');
    await apiClient.post('/notifications/read-all');
  }

  async getUnreadCount(): Promise<number> {
    const { apiClient } = await import('./api');
    const response = await apiClient.get<number>('/notifications/unread-count');
    return response.data;
  }
}

export const notificationService = new NotificationService();
