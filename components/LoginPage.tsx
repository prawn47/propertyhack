import React, { useState } from 'react';
import SparklesIcon from './icons/SparklesIcon';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onOTPLogin: (email: string, otp: string) => Promise<void>;
  onSwitchToRegister: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onOTPLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);


  const handleRequestOTP = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setOtpSent(true);
      setSuccess('OTP code sent to your email');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (loginMethod === 'password') {
        await onLogin(email, password);
      } else {
        await onOTPLogin(email, otp);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodSwitch = (method: 'password' | 'otp') => {
    setLoginMethod(method);
    setError('');
    setSuccess('');
    setOtpSent(false);
    setPassword('');
    setOtp('');
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
            <button
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center text-sm text-content-secondary hover:text-brand-accent transition-colors mb-4"
            >
              ← Back to Home
            </button>
            <div className="flex items-center justify-center space-x-4 mb-3">
              <img src="/ph-logo.jpg" alt="Property Hack" className="h-16 w-16 rounded-[15px]" />
              <h1 className="text-3xl font-bold text-content">Property Hack</h1>
            </div>
            <p className="text-content-secondary mt-2">Agenda-free Australian property news</p>
        </div>

        <div className="bg-base-100 p-8 rounded-xl shadow-lg gold-frame">
          {/* Login Method Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => handleMethodSwitch('password')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                loginMethod === 'password'
                  ? 'bg-brand-primary text-white'
                  : 'bg-base-200 text-content-secondary hover:bg-base-300'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => handleMethodSwitch('otp')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                loginMethod === 'otp'
                  ? 'bg-brand-primary text-white'
                  : 'bg-base-200 text-content-secondary hover:bg-base-300'
              }`}
            >
              Email OTP
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-content-secondary">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-content"
                placeholder="you@example.com"
              />
            </div>

            {loginMethod === 'password' ? (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-content-secondary">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-content"
                  placeholder="Your password"
                />
              </div>
            ) : (
              <>
                {!otpSent ? (
                  <div>
                    <button
                      type="button"
                      onClick={handleRequestOTP}
                      disabled={isLoading || !email}
                      className="w-full flex justify-center py-2 px-4 border border-brand-primary text-brand-primary bg-white hover:bg-brand-primary hover:text-white rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 transition-colors"
                    >
                      {isLoading ? 'Sending...' : 'Send OTP Code'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center">
                      <label htmlFor="otp" className="block text-sm font-medium text-content-secondary">
                        Enter OTP Code
                      </label>
                      <button
                        type="button"
                        onClick={handleRequestOTP}
                        disabled={isLoading}
                        className="text-xs text-brand-primary hover:text-brand-secondary"
                      >
                        Resend code
                      </button>
                    </div>
                    <input
                      type="text"
                      id="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      maxLength={6}
                      className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-content text-center text-2xl tracking-widest"
                      placeholder="000000"
                    />
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            {(loginMethod === 'password' || otpSent) && (
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary disabled:bg-gray-400"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </div>
            )}
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-base-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-base-100 text-content-secondary">Or continue with</span>
              </div>
            </div>

            {/* OAuth options removed; connection is managed in Settings only */}

            <div className="mt-6 text-center">
              <p className="text-sm text-content-secondary">
                Don't have an account?{' '}
                <button
                  onClick={onSwitchToRegister}
                  className="font-medium text-brand-primary hover:text-brand-secondary"
                >
                  Create one here
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
