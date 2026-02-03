import { io, Socket } from 'socket.io-client';
import { Message } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ChatSocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<Function>>();

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(`${API_URL}/chat`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Connected to chat');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat');
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
