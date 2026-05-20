import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenService } from './token.service';

export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3000');

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api/v1`,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = tokenService.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        const requestPath = originalRequest?.url ?? '';
        const baseURL = this.client.defaults.baseURL ?? '';
        const resolvedPath = requestPath.startsWith('/')
          ? requestPath
          : requestPath.replace(baseURL, '').replace(/^\//, '/');
        const isRefreshRequest = resolvedPath === '/auth/refresh' || resolvedPath === '/api/v1/auth/refresh';

        if (isRefreshRequest) {
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const accessToken = await this.refreshAccessToken();
            if (accessToken) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client.request(originalRequest);
            }
          } catch {
            // refresh failed, fall through to redirect
          }

          this.clearAuthAndRedirect();
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string | null> {
    // Coalesce concurrent refresh calls into a single request
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        try {
          const response = await axios.post(
            `${API_URL}/api/v1/auth/refresh`,
            undefined,
            { withCredentials: true },
          );
          const { accessToken } = response.data;
          tokenService.setAccessToken(accessToken);
          return accessToken as string;
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            return null;
          }
          throw error;
        } finally {
          this.refreshPromise = null;
        }
      })();
    }

    return this.refreshPromise;
  }

  private clearAuthAndRedirect() {
    tokenService.clearAccessToken();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  public getInstance(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new ApiClient().getInstance();

