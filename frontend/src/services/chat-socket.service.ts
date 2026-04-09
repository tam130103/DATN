import { io, Socket } from 'socket.io-client';
import { Message } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Attempt a silent token refresh. Returns the new access token or null on failure. */
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

class ChatSocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<Function>>();
  private token: string | null = null;
  /** Prevent concurrent refresh calls */
  private refreshing = false;

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
    this.socket = io(`${API_URL}/chat`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to chat');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat');
    });

    // Before each reconnect attempt, silently refresh the token if expired
    this.socket.io.on('reconnect_attempt', async () => {
      if (this.refreshing) return;
      this.refreshing = true;
      try {
        const fresh = await silentRefresh();
        if (fresh && this.socket) {
          this.token = fresh;
          this.socket.auth = { token: fresh };
        }
      } finally {
        this.refreshing = false;
      }
    });

    this.socket.on('connect_error', async (error: Error) => {
      console.error('Chat socket connection error:', error.message);

      // If the error looks like an expired/invalid token, attempt refresh immediately
      const msg = error.message?.toLowerCase() ?? '';
      if (
        msg.includes('expired') ||
        msg.includes('unauthorized') ||
        msg.includes('jwt') ||
        msg.includes('auth')
      ) {
        if (this.refreshing) return;
        this.refreshing = true;
        try {
          const fresh = await silentRefresh();
          if (fresh && this.socket) {
            this.token = fresh;
            this.socket.auth = { token: fresh };
          } else {
            // Refresh failed — redirect to login
            this.disconnect();
            window.location.href = '/login';
          }
        } finally {
          this.refreshing = false;
        }
      }
    });

    this.socket.on('newMessage', (message: Message) => {
      this.emit('newMessage', message);
    });

    this.socket.on('userTyping', (data: any) => {
      this.emit('userTyping', data);
    });

    this.socket.on('userOnline', (data: any) => {
      this.emit('userOnline', data);
    });

    this.socket.on('userOffline', (data: any) => {
      this.emit('userOffline', data);
    });

    this.socket.on('membersOnline', (data: any) => {
      this.emit('membersOnline', data);
    });

    this.socket.on('unreadCount', (count: number) => {
      this.emit('unreadCount', count);
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
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  isConnected() {
    return !!this.socket?.connected;
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  joinConversation(conversationId: string) {
    this.socket?.emit('joinConversation', { conversationId });
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit('leaveConversation', { conversationId });
  }

  sendMessage(conversationId: string, content: string) {
    this.socket?.emit('sendMessage', { conversationId, content });
  }

  markAsRead(conversationId: string) {
    this.socket?.emit('markAsRead', { conversationId });
  }

  sendTyping(conversationId: string, isTyping: boolean) {
    this.socket?.emit('typing', { conversationId, isTyping });
  }
}

export const chatSocketService = new ChatSocketService();
