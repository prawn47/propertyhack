import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LoginPageProps {
  onLogin?: (email: string, password: string) => Promise<void>;
  onBack?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onBack }) => {
  const { login, loginWithGoogle } = useAuth();
  const location = useLocation();
  const successMessage = (location.state as { message?: string })?.message;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (onLogin) {
        await onLogin(email, password);
      } else {
        await login(email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {onBack ? (
            <button
              onClick={onBack}
              className="inline-flex items-center text-sm text-content-secondary hover:text-brand-accent transition-colors mb-4"
            >
              ← Back to Home
            </button>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center text-sm text-content-secondary hover:text-brand-accent transition-colors mb-4"
            >
              ← Back to PropertyHack
            </Link>
          )}
          <Link to="/" className="flex flex-col items-center justify-center mb-3">
            <img src="/ph-logo.jpg" alt="PropertyHack — Global Property News & Intelligence" className="h-16 w-16 rounded-xl mb-3" />
            <h1 className="text-3xl font-bold text-content">PropertyHack</h1>
          </Link>
          <p className="text-content-secondary mt-2">Sign in to your account</p>
        </div>

        <div className="bg-base-100 p-8 rounded-xl shadow-soft">
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          <button
            type="button"
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-base-300 rounded-lg text-sm font-medium text-content hover:bg-base-200 transition-colors mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-base-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-base-100 text-content-secondary">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-content-secondary mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full px-3 py-2 bg-base-200 border border-base-300 rounded-lg text-sm text-content placeholder-content-secondary focus:outline-none focus:border-brand-gold"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-content-secondary">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-brand-gold hover:opacity-80">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full px-3 py-2 bg-base-200 border border-base-300 rounded-lg text-sm text-content placeholder-content-secondary focus:outline-none focus:border-brand-gold"
                placeholder="Your password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-medium text-brand-primary bg-brand-gold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-content-secondary">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-gold hover:opacity-80 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
