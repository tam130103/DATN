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
  /** Track whether we manually need to reconnect after a server disconnect */
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect(passedToken?: string) {
    // React's AuthContext might be stale because it doesn't auto-update when
    // intercepts refresh the token. Always prefer the freshest token from localStorage.
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
    this._createSocket(token);
  }

  private _createSocket(token: string) {
    this.socket = io(`${API_URL}/chat`, {
      auth: { token },
      // Let Socket.IO auto-reconnect on connect_error (middleware rejection)
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('[Chat] Connected');
    });

    // ── Handle server-initiated disconnect ──────────────────────────────
    // When server middleware rejects, Socket.IO fires 'disconnect' with
    // reason 'io server disconnect'. Auto-reconnect is suppressed in this
    // case, so we handle it manually.
    this.socket.on('disconnect', (reason: string) => {
      console.log('[Chat] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        this._scheduleRefreshAndReconnect();
      }
    });

    // ── Handle connection errors (middleware rejection → connect_error) ──
    // When the backend middleware calls next(new Error('TOKEN_EXPIRED')),
    // Socket.IO fires connect_error with that message. Auto-reconnect
    // IS active here, but we still need to refresh the token first.
    this.socket.on('connect_error', async (error: Error) => {
      const code = error.message?.trim();
      console.warn('[Chat] connect_error:', code);

      const isAuthError =
        code === 'TOKEN_EXPIRED' ||
        code === 'INVALID_TOKEN' ||
        code === 'NO_TOKEN' ||
        code?.toLowerCase().includes('expired') ||
        code?.toLowerCase().includes('jwt') ||
        code?.toLowerCase().includes('auth');

      if (isAuthError) {
        await this._doRefresh();
      }
    });

    // ── Before each auto-reconnect attempt, refresh token ───────────────
    this.socket.io.on('reconnect_attempt', async () => {
      if (this.refreshing) return;
      await this._doRefresh();
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

  /** Refresh the JWT and update socket auth. Redirects to /login if refresh fails. */
  private async _doRefresh(): Promise<void> {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      const fresh = await silentRefresh();
      if (fresh && this.socket) {
        this.token = fresh;
        this.socket.auth = { token: fresh };
        console.log('[Chat] Token refreshed, will retry connection');
      } else {
        // Refresh failed — session is truly expired, force re-login
        console.warn('[Chat] Token refresh failed, redirecting to login');
        this.disconnect();
        window.location.href = '/login';
      }
    } finally {
      this.refreshing = false;
    }
  }

  /**
   * Server-initiated disconnects suppress auto-reconnect.
   * We refresh the token then manually reconnect after a short delay.
   */
  private _scheduleRefreshAndReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this._doRefresh();
      if (this.socket && this.token) {
        console.log('[Chat] Manually reconnecting after server disconnect');
        this.socket.connect();
      }
    }, 2000);
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
