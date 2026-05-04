import { apiClient } from './api';
import { Comment } from '../types';

export const engagementService = {
  toggleLike: async (postId: string): Promise<{ liked: boolean; likesCount: number }> => {
    const response = await apiClient.post<{ liked: boolean; likesCount: number }>(`/posts/${postId}/like`);
    return response.data;
  },

  toggleSave: async (postId: string): Promise<{ saved: boolean }> => {
    const response = await apiClient.post<{ saved: boolean }>(`/posts/${postId}/save`);
    return response.data;
  },

  getPostComments: async (postId: string, page = 1, limit = 20): Promise<Comment[]> => {
    const response = await apiClient.get<Comment[]>(`/posts/${postId}/comments`, {
      params: { page, limit },
    });
    return response.data;
  },

  createComment: async (postId: string, content: string, parentId?: string, replyToUserId?: string): Promise<Comment> => {
    const response = await apiClient.post<Comment>(`/posts/${postId}/comments`, {
      content,
      parentId,
      replyToUserId,
    });
    return response.data;
  },

  updateComment: async (commentId: string, content: string): Promise<Comment> => {
    const response = await apiClient.patch<Comment>(`/posts/comments/${commentId}`, { content });
    return response.data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/posts/comments/${commentId}`);
  },

  getCommentReplies: async (commentId: string, page = 1, limit = 20): Promise<Comment[]> => {
    const response = await apiClient.get<Comment[]>(`/posts/comments/${commentId}/replies`, {
      params: { page, limit },
    });
    return response.data;
  },

  likeComment: async (commentId: string): Promise<{ liked: boolean; likesCount: number }> => {
    const response = await apiClient.post<{ liked: boolean; likesCount: number }>(`/posts/comments/${commentId}/like`);
    return response.data;
  },

  unlikeComment: async (commentId: string): Promise<{ liked: boolean; likesCount: number }> => {
    const response = await apiClient.delete<{ liked: boolean; likesCount: number }>(`/posts/comments/${commentId}/like`);
    return response.data;
  },
};
