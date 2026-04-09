import { apiClient } from './api';
import { User } from '../types';

export const userService = {
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  getByUsername: async (username: string): Promise<User & { isFollowing?: boolean }> => {
    const response = await apiClient.get<User>(`/users/${username}`);
    return response.data;
  },

  updateProfile: async (data: {
    username?: string;
    name?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<User> => {
    const response = await apiClient.patch<User>('/users/me', data);
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ url: string }>('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.url;
  },

  updateNotificationSettings: async (notificationEnabled: boolean): Promise<void> => {
    await apiClient.patch('/users/me/notification', { notificationEnabled });
  },

  followUser: async (userId: string): Promise<void> => {
    await apiClient.post(`/users/${userId}/follow`);
  },

  unfollowUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/users/${userId}/follow`);
  },

  getFollowers: async (userId: string, page = 1, limit = 20): Promise<User[]> => {
    const response = await apiClient.get<any>(`/users/${userId}/followers`, {
      params: { page, limit },
    });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
  },

  getFollowing: async (userId: string, page = 1, limit = 20): Promise<User[]> => {
    const response = await apiClient.get<any>(`/users/${userId}/following`, {
      params: { page, limit },
    });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
  },
};
