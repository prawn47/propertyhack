import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import Loader from './components/Loader';
import HomePage from './components/public/HomePage';
import ArticleDetail from './components/public/ArticleDetail';
import LocationPage from './components/public/LocationPage';
import CategoryPage from './components/public/CategoryPage';
import AboutPage from './components/public/AboutPage';
import ContactPage from './components/public/ContactPage';
import NotFoundPage from './components/public/NotFoundPage';
import AdminLayout from './components/layout/AdminLayout';
import ArticleList from './components/admin/ArticleList';
import ArticleEditor from './components/admin/ArticleEditor';
import SourceList from './components/admin/SourceList';
import SourceEditor from './components/admin/SourceEditor';
import SocialPostList from './components/admin/social/SocialPostList';
import SocialPostEditor from './components/admin/social/SocialPostEditor';
import IngestionMonitor from './components/admin/IngestionMonitor';
import PromptList from './components/admin/PromptList';
import PromptEditor from './components/admin/PromptEditor';
import SeoSettings from './components/admin/SeoSettings';
import ProfilePage from './components/user/ProfilePage';
import RentVsBuyCalculator from './components/calculators/RentVsBuyCalculator';
import BorrowingPowerCalculator from './components/calculators/BorrowingPowerCalculator';

function AdminPage({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) {
  return <AdminLayout onLogout={onLogout}>{children}</AdminLayout>;
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <Loader className="h-10 w-10 text-brand-primary" />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AppInner() {
  const { isAuthenticated, isAdmin, isLoading, login, logout } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return <LoadingScreen />;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/articles/:slug" element={<ArticleDetail />} />
      <Route path="/property-news/:location" element={<LocationPage />} />
      <Route path="/category/:slug" element={<CategoryPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* Calculator routes */}
      <Route path="/tools/rent-vs-buy-calculator" element={<RentVsBuyCalculator />} />
      <Route path="/tools/borrowing-power-calculator" element={<BorrowingPowerCalculator />} />

      {/* Auth routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={isAdmin ? '/admin' : '/'} replace />
          ) : (
            <LoginPage
              onLogin={async (email, password) => {
                await login(email, password);
                const from = (window.history.state?.usr?.from as { pathname?: string })?.pathname;
                navigate(from || (isAdmin ? '/admin' : '/'));
              }}
            />
          )
        }
      />

      {/* User routes — require any auth */}
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />

      {/* Admin routes — require admin role */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminPage onLogout={handleLogout}><IngestionMonitor /></AdminPage>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/articles"
        element={
          <RequireAdmin>
            <AdminPage onLogout={handleLogout}><ArticleList /></AdminPage>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/articles/new"
        element={
          <RequireAdmin>
            <AdminPage onLogout={handleLogout}><ArticleEditor /></AdminPage>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/articles/:id/edit"
        element={
          <RequireAdmin>
            <AdminPage onLogout={handleLogout}><ArticleEditor /></AdminPage>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/sources"
        element={
          <RequireAdmin>
            <AdminPage onLogout={handleLogout}><SourceList /></AdminPage>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/sources/new"
        element={
          <RequireAdmin>
            <AdminPage onLogout={handleLogout}><SourceEditor /></AdminPage>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/sources/:id/edit"
        element={
          <RequireAdmin>
            <AdminPage onLogout={handleLogout}><SourceEditor /></AdminPage>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/social"
        element={
          <RequireAdmin>
            <AdminPage onLogout={handleLogout}><SocialPostList /></AdminPage>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/social/new"
        element={
          <RequireAdmin>
            <AdminPage onLogout={handleLogout}><SocialPostEditor /></AdminPage>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/social/:id/edit"
        element={
          <RequireAdmin>
            <AdminPage onLogout={handleLogout}><SocialPostEditor /></AdminPage>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/prompts"
        element={
          <RequireAdmin>
            <AdminPage onLogout={handleLogout}><PromptList /></AdminPage>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/prompts/:id/edit"
        element={
          <RequireAdmin>
            <AdminPage onLogout={handleLogout}><PromptEditor /></AdminPage>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/seo"
        element={
          <RequireAdmin>
            <AdminPage onLogout={handleLogout}><SeoSettings /></AdminPage>
          </RequireAdmin>
        }
      />

      {/* 404 catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
};

export default App;
