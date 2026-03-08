import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';

const VerifyEmailPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const emailFromState = (location.state as { email?: string })?.email || user?.email || '';
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleDigitChange = (idx: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (char && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = Array(6).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await authService.verifyEmail(emailFromState, code);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !emailFromState) return;
    try {
      await authService.resendOtp(emailFromState);
      setCooldown(60);
      setResendMsg('Code sent! Check your inbox.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center mb-3">
            <img src="/ph-logo.jpg" alt="PropertyHack" className="h-16 w-16 rounded-xl mb-3" />
            <h1 className="text-3xl font-bold text-content">Verify your email</h1>
          </div>
          <p className="text-content-secondary mt-2">
            We sent a 6-digit code to{' '}
            {emailFromState ? <strong>{emailFromState}</strong> : 'your email address'}
          </p>
        </div>

        <div className="bg-base-100 p-8 rounded-xl shadow-soft">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-2xl font-bold bg-base-200 border border-base-300 rounded-lg text-content focus:outline-none focus:border-brand-gold"
                />
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {resendMsg && !error && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-700">{resendMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-medium text-brand-primary bg-brand-gold hover:opacity-90 transition-opacity disabled:opacity-50 mb-4"
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="w-full text-sm text-content-secondary hover:text-brand-gold disabled:text-content-secondary disabled:cursor-not-allowed transition-colors"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
