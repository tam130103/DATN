import { apiClient } from './api';
import { Message } from '../types';

export interface Conversation {
  id: string;
  isGroup: boolean;
  name: string | null;
  lastMessage: Message | null;
  members: Array<{
    id: string;
    username: string | null;
    name: string | null;
    avatarUrl: string | null;
  }>;
  updatedAt: string;
}

export const chatService = {
  createConversation: async (participantId: string): Promise<Conversation> => {
    const response = await apiClient.post<Conversation>('/conversations', {
      participantIds: [participantId],
    });
    return response.data;
  },

  getConversations: async (): Promise<Conversation[]> => {
    const response = await apiClient.get<Conversation[]>('/conversations');
    return response.data;
  },

  getMessages: async (conversationId: string, page = 1, limit = 50): Promise<Message[]> => {
    const response = await apiClient.get<Message[]>(`/conversations/${conversationId}/messages`, {
      params: { page, limit },
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<number>('/conversations/unread-count');
    return response.data;
  },

  leaveConversation: async (conversationId: string): Promise<void> => {
    await apiClient.post(`/conversations/${conversationId}/leave`);
  },
};
