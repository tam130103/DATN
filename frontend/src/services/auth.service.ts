import { apiClient } from './api';
import { User } from '../types';

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  googleLogin: async (idToken: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/google', { idToken });
    return response.data;
  },

  register: async (data: RegisterData): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await apiClient.post<{ accessToken: string }>('/auth/refresh', { refreshToken });
    return response.data;
  },
};
