import axios from 'axios';
import { API_URL, apiClient } from './api';
import { User } from '../types';

interface LoginResponse {
  user: User;
  accessToken: string;
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

  refreshToken: async (): Promise<{ accessToken: string }> => {
    const response = await axios.post<{ accessToken: string }>(
      `${API_URL}/api/v1/auth/refresh`,
      undefined,
      { withCredentials: true },
    );
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};
