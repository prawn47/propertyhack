import React, { useEffect } from 'react';
import Loader from './Loader';

interface OAuthCallbackProps {
  onAuthSuccess: (accessToken: string, refreshToken: string) => void;
  onAuthError: (error: string) => void;
}

const OAuthCallback: React.FC<OAuthCallbackProps> = ({ onAuthSuccess, onAuthError }) => {
  useEffect(() => {
    // Parse URL parameters manually since we don't have React Router
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('accessToken');
    const refreshToken = urlParams.get('refreshToken');
    const error = urlParams.get('message');

    if (error) {
      onAuthError(error);
      return;
    }

    if (accessToken && refreshToken) {
      onAuthSuccess(accessToken, refreshToken);
    } else {
      onAuthError('Invalid OAuth response');
    }
  }, [onAuthSuccess, onAuthError]);

  return (
    <div className="min-h-screen bg-base-200 flex flex-col justify-center items-center p-4">
      <div className="text-center">
        <Loader className="h-10 w-10 text-brand-primary mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-content mb-2">Completing Authentication</h2>
        <p className="text-content-secondary">Please wait while we sign you in...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
