import { apiClient as api } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalPosts: number;
  hiddenPosts: number;
  totalComments: number;
  hiddenComments: number;
  openReports: number;
}

export interface AdminDailyGrowth {
  date: string;
  users: number;
  posts: number;
}

export interface AdminDashboardResponse {
  stats: AdminStats;
  recentReports: AdminReport[];
  dailyGrowth: AdminDailyGrowth[];
}

export interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  blockedReason?: string | null;
  blockedAt?: string | null;
  followersCount: number;
  followingCount: number;
  createdAt: string;
}

export interface AdminPost {
  id: string;
  caption: string;
  status: string;
  moderationReason?: string | null;
  moderatedAt?: string | null;
  createdAt: string;
  user: { id: string; username: string | null; name: string | null; avatarUrl: string | null };
}

export interface AdminComment {
  id: string;
  content: string;
  status: string;
  moderationReason?: string | null;
  moderatedAt?: string | null;
  createdAt: string;
  user: { id: string; username: string | null; name: string | null; avatarUrl: string | null };
  post: { id: string; caption: string };
}

export interface AdminReport {
  id: string;
  targetType: 'post' | 'comment';
  targetId: string;
  reason: string;
  status: 'open' | 'resolved' | 'rejected';
  createdAt: string;
  reporter: { id: string; username: string | null; name: string | null };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const adminService = {
  getDashboard: async (): Promise<AdminDashboardResponse> => {
    const res = await api.get('/admin/dashboard');
    return res.data;
  },

  getUsers: async (params?: {
    search?: string;
    status?: string;
    role?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get('/admin/users', { params });
    return res.data as { users: AdminUser[]; total: number; page: number; totalPages: number };
  },

  updateUserStatus: async (id: string, status: string, reason?: string) => {
    const res = await api.patch(`/admin/users/${id}/status`, { status, reason });
    return res.data;
  },

  updateUserRole: async (id: string, role: 'user' | 'admin') => {
    const res = await api.patch(`/admin/users/${id}/role`, { role });
    return res.data;
  },

  getPosts: async (params?: { status?: string; page?: number; limit?: number }) => {
    const res = await api.get('/admin/posts', { params });
    return res.data as { posts: AdminPost[]; total: number; page: number; totalPages: number };
  },

  moderatePost: async (id: string, status: string, reason?: string) => {
    const res = await api.patch(`/admin/posts/${id}/moderation`, { status, reason });
    return res.data;
  },

  deletePost: async (id: string) => {
    const res = await api.delete(`/admin/posts/${id}`);
    return res.data;
  },

  getComments: async (params?: { status?: string; page?: number; limit?: number }) => {
    const res = await api.get('/admin/comments', { params });
    return res.data as { comments: AdminComment[]; total: number; page: number; totalPages: number };
  },

  moderateComment: async (id: string, status: string, reason?: string) => {
    const res = await api.patch(`/admin/comments/${id}/moderation`, { status, reason });
    return res.data;
  },

  deleteComment: async (id: string) => {
    const res = await api.delete(`/admin/comments/${id}`);
    return res.data;
  },

  getReports: async (params?: { status?: string; page?: number; limit?: number }) => {
    const res = await api.get('/admin/reports', { params });
    return res.data as { reports: AdminReport[]; total: number; page: number; totalPages: number };
  },

  reviewReport: async (id: string, status: 'resolved' | 'rejected') => {
    const res = await api.patch(`/admin/reports/${id}/review`, { status });
    return res.data;
  },

  // User-facing: submit a report
  createReport: async (targetType: 'post' | 'comment', targetId: string, reason: string) => {
    const res = await api.post('/reports', { targetType, targetId, reason });
    return res.data;
  },
};
