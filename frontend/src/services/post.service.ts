import { apiClient } from './api';
import { Post, FeedResponse } from '../types';

export interface UploadedMedia {
  url: string;
  type: 'IMAGE' | 'VIDEO';
  originalName?: string;
}

export interface CreatePostInput {
  caption: string;
  media?: { url: string; type: 'IMAGE' | 'VIDEO' }[];
}

export const postService = {
  uploadMedia: async (files: File[]): Promise<UploadedMedia[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await apiClient.post<UploadedMedia[]>('/posts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

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
