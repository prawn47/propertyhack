import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import LoginPage from './components/LoginPage';
import Loader from './components/Loader';
import HomePage from './components/public/HomePage';
import ArticleDetail from './components/public/ArticleDetail';
import AdminLayout from './components/layout/AdminLayout';
import ArticleList from './components/admin/ArticleList';
import ArticleEditor from './components/admin/ArticleEditor';
import SourceList from './components/admin/SourceList';
import SourceEditor from './components/admin/SourceEditor';
import SocialPostList from './components/admin/SocialPostList';
import SocialPostEditor from './components/admin/SocialPostEditor';
import IngestionMonitor from './components/admin/IngestionMonitor';
import PromptList from './components/admin/PromptList';
import PromptEditor from './components/admin/PromptEditor';
import type { AuthState } from './types';
import authService from './services/authService';

function AdminPage({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) {
  return <AdminLayout onLogout={onLogout}>{children}</AdminLayout>;
}

interface RequireAuthProps {
  authState: AuthState;
  children: React.ReactNode;
}

function RequireAuth({ authState, children }: RequireAuthProps) {
  const location = useLocation();
  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200">
        <Loader className="h-10 w-10 text-brand-primary" />
      </div>
    );
  }
  if (!authState.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

interface AppInnerProps {
  authState: AuthState;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => void;
}

function AppInner({ authState, onLogin, onLogout }: AppInnerProps) {
  const navigate = useNavigate();

  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200">
        <Loader className="h-10 w-10 text-brand-primary" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/articles/:slug" element={<ArticleDetail />} />
      <Route
        path="/login"
        element={
          authState.isAuthenticated ? (
            <Navigate to="/admin" replace />
          ) : (
            <LoginPage
              onLogin={async (email, password) => {
                await onLogin(email, password);
                navigate('/admin');
              }}
            />
          )
        }
      />

      {/* Admin routes — require auth */}
      <Route
        path="/admin"
        element={
          <RequireAuth authState={authState}>
            <AdminPage onLogout={onLogout}><IngestionMonitor /></AdminPage>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/monitor"
        element={
          <RequireAuth authState={authState}>
            <AdminPage onLogout={onLogout}><IngestionMonitor /></AdminPage>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/articles"
        element={
          <RequireAuth authState={authState}>
            <AdminPage onLogout={onLogout}><ArticleList /></AdminPage>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/articles/new"
        element={
          <RequireAuth authState={authState}>
            <AdminPage onLogout={onLogout}><ArticleEditor /></AdminPage>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/articles/:id/edit"
        element={
          <RequireAuth authState={authState}>
            <AdminPage onLogout={onLogout}><ArticleEditor /></AdminPage>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/sources"
        element={
          <RequireAuth authState={authState}>
            <AdminPage onLogout={onLogout}><SourceList /></AdminPage>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/sources/new"
        element={
          <RequireAuth authState={authState}>
            <AdminPage onLogout={onLogout}><SourceEditor /></AdminPage>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/sources/:id/edit"
        element={
          <RequireAuth authState={authState}>
            <AdminPage onLogout={onLogout}><SourceEditor /></AdminPage>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/social"
        element={
          <RequireAuth authState={authState}>
            <AdminPage onLogout={onLogout}><SocialPostList /></AdminPage>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/social/new"
        element={
          <RequireAuth authState={authState}>
            <AdminPage onLogout={onLogout}><SocialPostEditor /></AdminPage>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/social/:id/edit"
        element={
          <RequireAuth authState={authState}>
            <AdminPage onLogout={onLogout}><SocialPostEditor /></AdminPage>
          </RequireAuth>
        }
      />

      <Route
        path="/admin/prompts"
        element={
          <RequireAuth authState={authState}>
            <AdminPage onLogout={onLogout}><PromptList /></AdminPage>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/prompts/:id/edit"
        element={
          <RequireAuth authState={authState}>
            <AdminPage onLogout={onLogout}><PromptEditor /></AdminPage>
          </RequireAuth>
        }
      />

      {/* 404 catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          setAuthState({ isAuthenticated: true, user, isLoading: false });
        } else {
          setAuthState({ isAuthenticated: false, user: null, isLoading: false });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        await authService.logout();
        setAuthState({ isAuthenticated: false, user: null, isLoading: false });
      }
    };
    initializeAuth();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    localStorage.setItem('user', JSON.stringify(response.user));
    setAuthState({ isAuthenticated: true, user: response.user, isLoading: false });
  };

  const handleLogout = () => {
    setAuthState({ isAuthenticated: false, user: null, isLoading: false });
  };

  return (
    <BrowserRouter>
      <AppInner
        authState={authState}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
    </BrowserRouter>
  );
};

export default App;
