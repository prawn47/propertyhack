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
import { CountryProvider } from './contexts/CountryContext';
import LoginPage from './components/LoginPage';
import Loader from './components/Loader';
import HomePage from './components/public/HomePage';
import ArticleDetail from './components/public/ArticleDetail';
import LocationPage from './components/public/LocationPage';
import CategoryPage from './components/public/CategoryPage';
import AboutPage from './components/public/AboutPage';
import ContactPage from './components/public/ContactPage';
import TermsPage from './components/public/TermsPage';
import PrivacyPage from './components/public/PrivacyPage';
import NotFoundPage from './components/public/NotFoundPage';
import ToolsIndex from './components/calculators/ToolsIndex';
import AdminLayout from './components/layout/AdminLayout';
import ArticleList from './components/admin/ArticleList';
import ArticleEditor from './components/admin/ArticleEditor';
import SourceList from './components/admin/SourceList';
import SourceEditor from './components/admin/SourceEditor';
import SocialPostList from './components/admin/social/SocialPostList';
import SocialPostEditor from './components/admin/social/SocialPostEditor';
import SocialSettings from './components/admin/social/SocialSettings';
import IngestionMonitor from './components/admin/IngestionMonitor';
import PromptList from './components/admin/PromptList';
import PromptEditor from './components/admin/PromptEditor';
import SeoSettings from './components/admin/SeoSettings';
import RegisterPage from './components/auth/RegisterPage';
import VerifyEmailPage from './components/auth/VerifyEmailPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import GoogleAuthCallback from './components/auth/GoogleAuthCallback';
import MortgageCalculator from './components/calculators/MortgageCalculator';
import StampDutyCalculator from './components/calculators/StampDutyCalculator';
import RentalYieldCalculator from './components/calculators/RentalYieldCalculator';
import ScenarioDashboard from './components/user/ScenarioDashboard';
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
      <Route path="/tools/stamp-duty-calculator" element={<StampDutyCalculator />} />
      <Route path="/articles/:slug" element={<ArticleDetail />} />
      <Route path="/property-news/:location" element={<LocationPage />} />
      <Route path="/category/:slug" element={<CategoryPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* Calculator routes */}
      <Route path="/tools" element={<ToolsIndex />} />
      <Route path="/tools/mortgage-calculator" element={<MortgageCalculator />} />
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
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />

      {/* User routes — require auth */}
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile/scenarios"
        element={
          <RequireAuth>
            <ScenarioDashboard />
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

      <Route
        path="/admin/settings/social"
        element={
          <RequireAdmin>
            <AdminPage onLogout={handleLogout}><SocialSettings /></AdminPage>
          </RequireAdmin>
        }
      />

      {/* Calculator routes (public) */}
      <Route path="/tools/rental-yield-calculator" element={<RentalYieldCalculator />} />

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
          <CountryProvider>
            <AppInner />
          </CountryProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
};

export default App;
