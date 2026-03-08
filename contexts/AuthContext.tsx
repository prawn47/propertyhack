import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService, { RegisterData } from '../services/authService';
import { getApiUrl } from '../services/apiConfig';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'user';
  avatarUrl: string | null;
  emailVerified: boolean;
  newsletterOptIn: boolean;
  preferences: {
    defaultLocation?: string;
    defaultCategories?: string[];
    defaultDateRange?: string;
  } | null;
  superAdmin?: boolean;
  createdAt?: string;
}

export interface ProfileUpdate {
  displayName?: string;
  preferences?: User['preferences'];
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        if (authService.isAuthenticated()) {
          const stored = localStorage.getItem('user');
          if (stored) {
            setUser(JSON.parse(stored));
          }
        }
      } catch (err) {
        console.error('Auth init failed:', err);
        await authService.logout();
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    const u: User = {
      id: response.user.id,
      email: response.user.email,
      displayName: response.user.displayName,
      role: (response.user.role as 'admin' | 'user') || 'user',
      avatarUrl: response.user.avatarUrl,
      emailVerified: response.user.emailVerified,
      newsletterOptIn: response.user.newsletterOptIn,
      preferences: (response.user.preferences as User['preferences']) || null,
      superAdmin: response.user.superAdmin,
      createdAt: response.user.createdAt,
    };
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const response = await authService.register(data);
    const u: User = {
      id: response.user.id,
      email: response.user.email,
      displayName: response.user.displayName,
      role: (response.user.role as 'admin' | 'user') || 'user',
      avatarUrl: response.user.avatarUrl,
      emailVerified: response.user.emailVerified,
      newsletterOptIn: response.user.newsletterOptIn,
      preferences: (response.user.preferences as User['preferences']) || null,
      superAdmin: response.user.superAdmin,
      createdAt: response.user.createdAt,
    };
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  }, []);

  const loginWithGoogle = useCallback(() => {
    window.location.href = getApiUrl('/api/auth/google');
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: ProfileUpdate) => {
    const response = await authService.makeAuthenticatedRequest(
      getApiUrl('/api/user/profile'),
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Profile update failed');
    }
    const updated = await response.json();
    const u: User = {
      ...user!,
      displayName: updated.user?.displayName ?? user!.displayName,
      preferences: updated.user?.preferences ?? user!.preferences,
    };
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  }, [user]);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin' || user?.superAdmin === true;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isAdmin, isLoading, login, loginWithGoogle, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
