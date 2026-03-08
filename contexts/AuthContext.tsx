import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface UserPreferences {
  defaultLocation?: string;
  defaultCategories?: string[];
  defaultDateRange?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'user';
  avatarUrl: string | null;
  emailVerified: boolean;
  newsletterOptIn: boolean;
  preferences: UserPreferences | null;
}

interface RegisterData {
  displayName: string;
  email: string;
  password: string;
  newsletterOptIn?: boolean;
}

interface ProfileUpdate {
  displayName?: string;
  preferences?: UserPreferences;
  newsletterOptIn?: boolean;
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

function getStoredToken(): string | null {
  return localStorage.getItem('accessToken');
}

function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  return fetch(path, { ...options, headers });
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await apiFetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || data);
      } else {
        clearTokens();
        setUser(null);
      }
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const login = async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    storeTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const loginWithGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  const register = async (data: RegisterData) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed');
    }
    const result = await res.json();
    storeTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
  };

  const logout = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    clearTokens();
    setUser(null);
  };

  const updateProfile = async (data: ProfileUpdate) => {
    const res = await apiFetch('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Update failed');
    }
    const result = await res.json();
    setUser(result.user || result);
  };

  const isAuthenticated = !!user;
  const isAdmin = !!user && (user.role === 'admin' || (user as any).superAdmin === true);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isAdmin, isLoading, login, loginWithGoogle, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
