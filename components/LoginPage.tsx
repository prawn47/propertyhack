import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onBack?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center text-sm text-content-secondary hover:text-brand-accent transition-colors mb-4"
            >
              ← Back to Home
            </button>
          )}
          <div className="flex items-center justify-center space-x-4 mb-3">
            <h1 className="text-3xl font-bold text-content">PropertyHack</h1>
          </div>
          <p className="text-content-secondary mt-2">Admin sign in</p>
        </div>

        <div className="bg-base-100 p-8 rounded-xl shadow-lg gold-frame">
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

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-brand-primary bg-brand-gold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold disabled:opacity-50"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
