import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import LoginPage from './components/LoginPage';
import Loader from './components/Loader';
import HomePage from './components/public/HomePage';
import AdminLayout from './components/layout/AdminLayout';
import ArticleList from './components/admin/ArticleList';
import ArticleEditor from './components/admin/ArticleEditor';
import SourceList from './components/admin/SourceList';
import SourceEditor from './components/admin/SourceEditor';
import SocialPostList from './components/admin/SocialPostList';
import IngestionMonitor from './components/admin/IngestionMonitor';
import type { AuthState } from './types';
import authService from './services/authService';

function withAdminLayout(Component: React.ComponentType) {
  return function AdminPage() {
    return (
      <AdminLayout>
        <Component />
      </AdminLayout>
    );
  };
}

const AdminDashboard = withAdminLayout(IngestionMonitor);
const AdminArticles = withAdminLayout(ArticleList);
const AdminArticleEdit = withAdminLayout(ArticleEditor);
const AdminSources = withAdminLayout(SourceList);
const AdminSourceEdit = withAdminLayout(SourceEditor);
const AdminSocial = withAdminLayout(SocialPostList);
const AdminMonitor = withAdminLayout(IngestionMonitor);

interface AppInnerProps {
  authState: AuthState;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

function AppInner({ authState, onLogin }: AppInnerProps) {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);

  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200">
        <Loader className="h-10 w-10 text-brand-primary" />
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    if (showLogin) {
      return (
        <LoginPage
          onLogin={async (email, password) => {
            await onLogin(email, password);
            navigate('/admin');
          }}
          onBack={() => setShowLogin(false)}
        />
      );
    }
    return <HomePage onAdminClick={() => setShowLogin(true)} />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage onAdminClick={() => setShowLogin(true)} />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/articles" element={<AdminArticles />} />
      <Route path="/admin/articles/:id/edit" element={<AdminArticleEdit />} />
      <Route path="/admin/sources" element={<AdminSources />} />
      <Route path="/admin/sources/new" element={<AdminSourceEdit />} />
      <Route path="/admin/sources/:id" element={<AdminSourceEdit />} />
      <Route path="/admin/social" element={<AdminSocial />} />
      <Route path="/admin/monitor" element={<AdminMonitor />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
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

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('user');
      setAuthState({ isAuthenticated: false, user: null, isLoading: false });
    }
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
