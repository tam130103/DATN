import { apiClient } from './api';
import { Post, FeedResponse } from '../types';

export interface CreatePostInput {
  caption: string;
  media: { url: string; type: 'IMAGE' | 'VIDEO' }[];
}

export const postService = {
  createPost: async (data: CreatePostInput): Promise<Post> => {
    const response = await apiClient.post<Post>('/posts', data);
    return response.data;
  },

  getFeed: async (cursor?: string, limit = 20): Promise<FeedResponse> => {
    const params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    const response = await apiClient.get<FeedResponse>('/posts/feed', { params });
    return response.data;
  },

  getPostById: async (id: string): Promise<Post> => {
    const response = await apiClient.get<Post>(`/posts/${id}`);
    return response.data;
  },

  deletePost: async (id: string): Promise<void> => {
    await apiClient.delete(`/posts/${id}`);
  },
};
