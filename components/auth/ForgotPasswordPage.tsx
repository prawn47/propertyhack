import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await authService.forgotPassword(email);
      navigate('/reset-password', { state: { email } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center mb-3">
            <img src="/ph-logo.jpg" alt="PropertyHack" className="h-16 w-16 rounded-xl mb-3" />
            <h1 className="text-3xl font-bold text-content">Forgot password?</h1>
          </div>
          <p className="text-content-secondary mt-2">
            Enter your email and we'll send you a reset code
          </p>
        </div>

        <div className="bg-base-100 p-8 rounded-xl shadow-soft">
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
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-content-secondary">
            Remember your password?{' '}
            <Link to="/login" className="text-brand-gold hover:opacity-80 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
