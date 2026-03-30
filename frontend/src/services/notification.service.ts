import { io, Socket } from 'socket.io-client';
import { apiClient } from './api';
import { Notification } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class NotificationService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<Function>>();
  private token: string | null = null;

  connect(token: string) {
    if (this.socket && this.token && this.token !== token) {
      this.disconnect();
    }

    if (this.socket) {
      this.token = token;
      this.socket.auth = { token };
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return;
    }

    this.token = token;
    this.socket = io(`${API_URL}/notifications`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      withCredentials: true,
    });

    this.socket.on('notification', (notification: Notification) => {
      this.emit('notification', notification);
    });

    this.socket.on('unreadCount', (count: number) => {
      this.emit('unreadCount', count);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Notification socket connection error:', error.message);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.token = null;
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

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
    const response = await apiClient.get<Notification[]>('/notifications', {
      params: { page, limit },
    });
    return response.data;
  }

  async markAsReadHttp(notificationId: string): Promise<void> {
    await apiClient.post(`/notifications/${notificationId}/read`);
  }

  async markAllAsReadHttp(): Promise<void> {
    await apiClient.post('/notifications/read-all');
  }

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<number>('/notifications/unread-count');
    return response.data;
  }
}

export const notificationService = new NotificationService();
