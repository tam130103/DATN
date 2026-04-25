/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { chatSocketService } from '../services/chat-socket.service';
import { notificationService } from '../services/notification.service';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  completeRedirectLogin: (accessToken: string, refreshToken: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (nextUser: User | null | ((previous: User | null) => User | null)) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const clearStoredSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  };

  const persistTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setToken(accessToken);
  };

  const refreshUser = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          await refreshUser();
          setToken(storedToken);
        } catch {
          clearStoredSession();
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const completeRedirectLogin = async (accessToken: string, refreshToken: string) => {
    persistTokens(accessToken, refreshToken);

    try {
      await refreshUser();
    } catch (error) {
      clearStoredSession();
      setToken(null);
      setUser(null);
      throw error;
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    const response = await authService.googleLogin(idToken);
    persistTokens(response.accessToken, response.refreshToken);
    setUser(response.user);
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    persistTokens(response.accessToken, response.refreshToken);
    setUser(response.user);
  };

  const register = async (email: string, password: string, name?: string) => {
    const response = await authService.register({ email, password, name });
    persistTokens(response.accessToken, response.refreshToken);
    setUser(response.user);
  };

  const logout = () => {
    chatSocketService.disconnect();
    notificationService.disconnect();
    clearStoredSession();
    setToken(null);
    setUser(null);
  };

  const updateUser = (nextUser: User | null | ((previous: User | null) => User | null)) => {
    setUser((previous) =>
      typeof nextUser === 'function' ? (nextUser as (previous: User | null) => User | null)(previous) : nextUser,
    );
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    completeRedirectLogin,
    loginWithGoogle,
    login,
    register,
    logout,
    refreshUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
