import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../services/apiConfig';

// Minimal LinkedIn UI for Settings only: status + connect/disconnect
const LinkedInSimple: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check LinkedIn authentication status using the proper endpoint
      const response = await fetch(getApiUrl('/api/linkedin/status'));
      const data = await response.json();
      setIsAuthenticated(data.isAuthenticated || false);
      if (data.user) {
        setUserInfo(data.user);
      }
    } catch (error) {
      console.error('Failed to check LinkedIn status:', error);
      setIsAuthenticated(false);
    }
  };

  const handleConnect = () => {
    // Redirect to LinkedIn OAuth - exact same as working app
    window.location.href = getApiUrl('/api/auth/linkedin');
  };

  const handleDisconnect = async () => {
    try {
      await fetch(getApiUrl('/api/linkedin/logout'), { method: 'POST' });
      setIsAuthenticated(false);
      setUserInfo(null);
      setMessage('✅ Disconnected from LinkedIn');
    } catch (error) {
      setMessage('❌ Logout failed');
    }
  };

  return (
    <div className="bg-base-100 p-6 rounded-lg shadow-md max-w-md">
      <h3 className="text-lg font-semibold mb-4 text-content">LinkedIn</h3>
      
      {message && (
        <div className="mb-4 p-2 rounded bg-base-200 text-sm">
          {message}
        </div>
      )}

      {isAuthenticated ? (
        <div className="space-y-4">
          <p className="text-green-600 font-medium">✅ LinkedIn Connected{userInfo?.name ? ` (${userInfo.name})` : ''}</p>
          <button className="btn btn-outline btn-sm w-full" onClick={handleDisconnect}>Disconnect</button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-red-500 font-medium">❌ LinkedIn Disconnected</p>
          <button className="btn btn-info w-full" onClick={handleConnect}>Connect with LinkedIn</button>
        </div>
      )}
    </div>
  );
};

export default LinkedInSimple;
