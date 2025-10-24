import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Loader from './Loader';

interface OAuthCallbackProps {
  onAuthSuccess: (accessToken: string, refreshToken: string) => void;
  onAuthError: (error: string) => void;
}

const OAuthCallback: React.FC<OAuthCallbackProps> = ({ onAuthSuccess, onAuthError }) => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('message');

    if (error) {
      onAuthError(error);
      return;
    }

    if (accessToken && refreshToken) {
      onAuthSuccess(accessToken, refreshToken);
    } else {
      onAuthError('Invalid OAuth response');
    }
  }, [searchParams, onAuthSuccess, onAuthError]);

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
