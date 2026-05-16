import { io, Socket } from 'socket.io-client';
import { apiClient } from './api';
import { Notification } from '../types';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3000');

async function silentRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data?.accessToken) {
      localStorage.setItem('token', data.accessToken);
      return data.accessToken;
    }

    return null;
  } catch {
    return null;
  }
}

class NotificationService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<Function>>();
  private token: string | null = null;
  private refreshing = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect(passedToken?: string) {
    const token = localStorage.getItem('token') || passedToken;
    if (!token) return;

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
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('[Notifications] Connected');
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[Notifications] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        this.scheduleRefreshAndReconnect();
      }
    });

    this.socket.on('notification', (notification: Notification | null) => {
      if (!notification) return;
      this.emit('notification', notification);
    });

    this.socket.on('unreadCount', (count: number) => {
      this.emit('unreadCount', count);
    });

    this.socket.on('connect_error', async (error: Error) => {
      const code = error.message?.trim();
      console.warn('[Notifications] connect_error:', code);

      if (code === 'ACCOUNT_BLOCKED') {
        this.handleAccountBlocked();
        return;
      }

      const isAuthError =
        code === 'TOKEN_EXPIRED' ||
        code === 'INVALID_TOKEN' ||
        code === 'NO_TOKEN' ||
        code?.toLowerCase().includes('expired') ||
        code?.toLowerCase().includes('jwt') ||
        code?.toLowerCase().includes('auth');

      if (isAuthError) {
        await this.doRefresh();
      }
    });

    this.socket.io.on('reconnect_attempt', async () => {
      if (this.refreshing) return;
      await this.doRefresh();
    });

    this.socket.on('error', (data: { code?: string; message?: string }) => {
      if (data?.code === 'ACCOUNT_BLOCKED' || data?.message === 'ACCOUNT_BLOCKED') {
        this.handleAccountBlocked();
      }
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
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

  private async doRefresh(): Promise<void> {
    if (this.refreshing) return;
    this.refreshing = true;

    try {
      const fresh = await silentRefresh();
      if (fresh && this.socket) {
        this.token = fresh;
        this.socket.auth = { token: fresh };
        console.log('[Notifications] Token refreshed, will retry connection');
      } else {
        console.warn('[Notifications] Token refresh failed, redirecting to login');
        this.disconnect();
        window.location.href = '/login';
      }
    } finally {
      this.refreshing = false;
    }
  }

  private handleAccountBlocked() {
    console.warn('[Notifications] Account blocked, clearing session');
    this.disconnect();
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  private scheduleRefreshAndReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.doRefresh();
      if (this.socket && this.token) {
        console.log('[Notifications] Manually reconnecting after server disconnect');
        this.socket.connect();
      }
    }, 2000);
  }
}

export const notificationService = new NotificationService();
