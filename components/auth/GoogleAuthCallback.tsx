import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import Loader from '../Loader';

const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      authService.saveTokensToStorage(accessToken, refreshToken);
      // Reload to reinitialise AuthContext with the new tokens
      window.location.replace('/');
    } else {
      navigate('/login', { state: { message: 'Google sign-in failed. Please try again.' } });
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <Loader className="h-10 w-10 text-brand-primary" />
    </div>
  );
};

export default GoogleAuthCallback;
