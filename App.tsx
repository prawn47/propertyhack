import React, { useEffect, useState } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
  Outlet,
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

const SUPPORTED_MARKETS = ['au', 'us', 'uk', 'ca'];
const STORAGE_KEY = 'ph_country';

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

function CountryRedirect() {
  const navigate = useNavigate();
  const [detecting, setDetecting] = useState(true);

  useEffect(() => {
    async function detect() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_MARKETS.includes(stored.toLowerCase())) {
        navigate(`/${stored.toLowerCase()}`, { replace: true });
        return;
      }

      try {
        const res = await fetch('http://ip-api.com/json/?fields=status,countryCode');
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success' && data.countryCode) {
            const code = data.countryCode.toLowerCase();
            const target = SUPPORTED_MARKETS.includes(code) ? code : 'au';
            localStorage.setItem(STORAGE_KEY, target.toUpperCase());
            navigate(`/${target}`, { replace: true });
            return;
          }
        }
      } catch {
        // fall through to default
      }

      navigate('/au', { replace: true });
    }

    detect().finally(() => setDetecting(false));
  }, [navigate]);

  if (detecting) return <LoadingScreen />;
  return null;
}

function CountryLayout() {
  const { country } = useParams<{ country: string }>();

  if (!country || !SUPPORTED_MARKETS.includes(country.toLowerCase())) {
    return <NotFoundPage />;
  }

  return (
    <CountryProvider countryFromUrl={country}>
      <Outlet />
    </CountryProvider>
  );
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
      {/* Root — detect country and redirect */}
      <Route path="/" element={<CountryRedirect />} />

      {/* Legacy redirects — old flat paths → country-prefixed */}
      <Route path="/articles/:slug" element={<LegacyArticleRedirect />} />
      <Route path="/property-news/:location" element={<LegacyLocationRedirect />} />
      <Route path="/category/:slug" element={<LegacyCategoryRedirect />} />

      {/* Country-prefixed public routes */}
      <Route path="/:country" element={<CountryLayout />}>
        <Route index element={<HomePage />} />
        <Route path="article/:slug" element={<ArticleDetail />} />
        <Route path="property-news/:location" element={<LocationPage />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="tools" element={<ToolsIndex />} />
        <Route path="tools/mortgage-calculator" element={<MortgageCalculator />} />
        <Route path="tools/stamp-duty-calculator" element={<StampDutyCalculator />} />
        <Route path="tools/rent-vs-buy-calculator" element={<RentVsBuyCalculator />} />
        <Route path="tools/borrowing-power-calculator" element={<BorrowingPowerCalculator />} />
        <Route path="tools/rental-yield-calculator" element={<RentalYieldCalculator />} />
      </Route>

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

      {/* Admin routes — require admin role, no country prefix */}
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

      {/* 404 catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function LegacyArticleRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/au/article/${slug ?? ''}`} replace />;
}

function LegacyLocationRedirect() {
  const { location: loc } = useParams<{ location: string }>();
  return <Navigate to={`/au/property-news/${loc ?? ''}`} replace />;
}

function LegacyCategoryRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/au/category/${slug ?? ''}`} replace />;
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
