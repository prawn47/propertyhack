import React, { useState } from 'react';
import { getApiUrl } from '../services/apiConfig';
import authService from '../services/authService';
import type { User } from '../types';

interface LinkedInSimpleProps {
  user: User | null;
  onUserUpdate?: () => void;
}

// Minimal LinkedIn UI for Settings only: status + connect/disconnect
const LinkedInSimple: React.FC<LinkedInSimpleProps> = ({ user, onUserUpdate }) => {
  const [message, setMessage] = useState('');

  const handleConnect = () => {
    // Redirect to LinkedIn OAuth - exact same as working app
    window.location.href = getApiUrl('/api/auth/linkedin');
  };

  const handleDisconnect = async () => {
    try {
      await authService.makeAuthenticatedRequest(getApiUrl('/api/linkedin/logout'), { method: 'POST' });
      setMessage('✅ Disconnected from LinkedIn');
      if (onUserUpdate) {
        onUserUpdate();
      }
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

      {user?.linkedinConnected ? (
        <div className="space-y-4">
          <p className="text-green-600 font-medium">✅ LinkedIn Connected</p>
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
