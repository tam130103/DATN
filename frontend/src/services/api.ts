import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
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

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            this.clearAuthAndRedirect();
            return Promise.reject(error);
          }

          try {
            const accessToken = await this.refreshAccessToken(refreshToken);
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

  private async refreshAccessToken(refreshToken: string): Promise<string | null> {
    // Coalesce concurrent refresh calls into a single request
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        try {
          const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
          const { accessToken } = response.data;
          localStorage.setItem('token', accessToken);
          return accessToken as string;
        } catch {
          return null;
        } finally {
          this.refreshPromise = null;
        }
      })();
    }

    return this.refreshPromise;
  }

  private clearAuthAndRedirect() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }

  public getInstance(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new ApiClient().getInstance();

