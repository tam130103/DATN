import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (data: SendMessageData) => void;
  markAsRead: (conversationId: string, userId: string) => void;
  sendTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
}

interface SendMessageData {
  conversationId: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'file';
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = React.useState<Socket | null>(null);

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        auth: { token },
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('Connected to WebSocket server');
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      setSocket(null);
    }
  }, [isAuthenticated, token]);

  const joinConversation = (conversationId: string) => {
    socket?.emit('joinConversation', { conversationId });
  };

  const leaveConversation = (conversationId: string) => {
    socket?.emit('leaveConversation', { conversationId });
  };

  const sendMessage = (data: SendMessageData) => {
    socket?.emit('sendMessage', data);
  };

  const markAsRead = (conversationId: string, userId: string) => {
    socket?.emit('markAsRead', { conversationId, userId });
  };

  const sendTyping = (conversationId: string, userId: string, isTyping: boolean) => {
    socket?.emit('typing', { conversationId, userId, isTyping });
  };

  const value: SocketContextType = {
    socket,
    joinConversation,
    leaveConversation,
    sendMessage,
    markAsRead,
    sendTyping,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
