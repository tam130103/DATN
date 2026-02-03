import { apiClient } from './api';
import { User, Hashtag, Post } from '../types';

export const searchService = {
  searchUsers: async (query: string, page = 1, limit = 20): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/search/users', {
      params: { q: query, page, limit },
    });
    return response.data;
  },

  searchHashtags: async (query: string, page = 1, limit = 20): Promise<Hashtag[]> => {
    const response = await apiClient.get<Hashtag[]>('/search/hashtags', {
      params: { q: query, page, limit },
    });
    return response.data;
  },

  getHashtagPosts: async (name: string, page = 1, limit = 20): Promise<Post[]> => {
    const response = await apiClient.get<Post[]>(`/search/hashtags/${name}/posts`, {
      params: { page, limit },
    });
    return response.data;
  },

  globalSearch: async (query: string, page = 1, limit = 10): Promise<{
    users: User[];
    hashtags: Hashtag[];
  }> => {
    const response = await apiClient.get('/search/global', {
      params: { q: query, page, limit },
    });
    return response.data;
  },

  getTrendingHashtags: async (limit = 10): Promise<Hashtag[]> => {
    const response = await apiClient.get<Hashtag[]>('/search/trending', {
      params: { limit },
    });
    return response.data;
  },
};
