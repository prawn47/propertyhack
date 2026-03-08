import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

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
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  logout: () => void;
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
            setUser(JSON.parse(stored) as User);
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const logout = async () => {
    await authService.logout();
    setUser(null);
    localStorage.removeItem('user');
  };

  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = user?.superAdmin === true || user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isAdmin, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Fallback for components rendered outside AuthProvider (e.g. calculator pages
    // before full auth is wired). Returns an anonymous-user context.
    return {
      user: null,
      isAuthenticated: authService.isAuthenticated(),
      isAdmin: false,
      isLoading: false,
      logout: () => authService.logout(),
    };
  }
  return ctx;
}
