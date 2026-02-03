import { apiClient } from './api';
import { Comment } from '../types';

export const engagementService = {
  toggleLike: async (postId: string): Promise<{ liked: boolean }> => {
    const response = await apiClient.post<{ liked: boolean }>(`/posts/${postId}/like`);
    return response.data;
  },

  getPostComments: async (postId: string, page = 1, limit = 20): Promise<Comment[]> => {
    const response = await apiClient.get<Comment[]>(`/posts/${postId}/comments`, {
      params: { page, limit },
    });
    return response.data;
  },

  createComment: async (postId: string, content: string, parentId?: string): Promise<Comment> => {
    const response = await apiClient.post<Comment>(`/posts/${postId}/comments`, {
      content,
      parentId,
    });
    return response.data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/posts/comments/${commentId}`);
  },
};
