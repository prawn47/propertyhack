import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import authService from '../../services/authService';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = (location.state as { email?: string })?.email || '';

  const [email, setEmail] = useState(emailFromState);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(email, otpCode, newPassword);
      navigate('/login', { state: { message: 'Password reset successfully. Please sign in.' } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
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
            <h1 className="text-3xl font-bold text-content">Reset password</h1>
          </div>
          <p className="text-content-secondary mt-2">
            Enter the code we sent to your email and choose a new password
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

            <div>
              <label htmlFor="otpCode" className="block text-sm font-medium text-content-secondary mb-1">
                Reset Code
              </label>
              <input
                type="text"
                id="otpCode"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                inputMode="numeric"
                className="block w-full px-3 py-2 bg-base-200 border border-base-300 rounded-lg text-sm text-content placeholder-content-secondary focus:outline-none focus:border-brand-gold tracking-widest text-center text-lg font-bold"
                placeholder="000000"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-content-secondary mb-1">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="block w-full px-3 py-2 bg-base-200 border border-base-300 rounded-lg text-sm text-content placeholder-content-secondary focus:outline-none focus:border-brand-gold"
                placeholder="Min. 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-content-secondary mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="block w-full px-3 py-2 bg-base-200 border border-base-300 rounded-lg text-sm text-content placeholder-content-secondary focus:outline-none focus:border-brand-gold"
                placeholder="Repeat new password"
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
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-content-secondary">
            Back to{' '}
            <Link to="/login" className="text-brand-gold hover:opacity-80 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
