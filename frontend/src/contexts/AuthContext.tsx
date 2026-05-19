/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { chatSocketService } from '../services/chat-socket.service';
import { notificationService } from '../services/notification.service';
import { tokenService } from '../services/token.service';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
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
  const [token, setToken] = useState<string | null>(tokenService.getAccessToken());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { accessToken } = await authService.refreshToken();
        tokenService.setAccessToken(accessToken);
        await refreshUser();
      } catch {
        tokenService.clearAccessToken();
        setUser(null);
      }
      setIsLoading(false);
    };

    const unsubscribe = tokenService.subscribe(setToken);
    initAuth();

    return unsubscribe;
  }, []);

  const loginWithGoogle = async (idToken: string) => {
    const response = await authService.googleLogin(idToken);
    tokenService.setAccessToken(response.accessToken);
    setUser(response.user);
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    tokenService.setAccessToken(response.accessToken);
    setUser(response.user);
  };

  const register = async (email: string, password: string, name?: string) => {
    const response = await authService.register({ email, password, name });
    tokenService.setAccessToken(response.accessToken);
    setUser(response.user);
  };

  const logout = () => {
    chatSocketService.disconnect();
    notificationService.disconnect();
    void authService.logout().catch(() => undefined);
    tokenService.clearAccessToken();
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
