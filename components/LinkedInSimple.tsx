import React, { useState, useEffect } from 'react';

// EXACT copy of working app logic
const LinkedInSimple: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [postText, setPostText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check LinkedIn authentication status using the proper endpoint
      const response = await fetch('/api/linkedin/status');
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
    window.location.href = '/api/auth/linkedin';
  };

  const handlePost = async () => {
    if (!postText.trim()) return;

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/linkedin/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: postText,
          image: null // No image for now
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Post successful! ID: ${data.postId}`);
        setPostText('');
      } else {
        setMessage(`❌ Failed: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-base-100 p-6 rounded-lg shadow-md max-w-md">
      <h3 className="text-lg font-semibold mb-4 text-content">LinkedIn - Clean Implementation</h3>
      
      {message && (
        <div className="mb-4 p-2 rounded bg-base-200 text-sm">
          {message}
        </div>
      )}

      {isAuthenticated ? (
        <div className="space-y-4">
          <p className="text-green-600 font-medium">✅ LinkedIn Connected!</p>
          
          <textarea
            className="textarea textarea-bordered w-full"
            placeholder="What's on your mind?"
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            rows={4}
          />
          
          <button 
            className="btn btn-primary w-full" 
            onClick={handlePost}
            disabled={isLoading || !postText.trim()}
          >
            {isLoading ? 'Posting...' : 'Post to LinkedIn'}
          </button>
          
          <button 
            className="btn btn-outline btn-sm w-full" 
            onClick={async () => {
              try {
                await fetch('/api/linkedin/logout', { method: 'POST' });
                setIsAuthenticated(false);
                setUserInfo(null);
                setMessage('✅ Disconnected from LinkedIn');
              } catch (error) {
                console.error('Logout failed:', error);
                setMessage('❌ Logout failed');
              }
            }}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-red-500 font-medium">❌ LinkedIn Disconnected</p>
          <button 
            className="btn btn-info w-full" 
            onClick={handleConnect}
          >
            Connect with LinkedIn
          </button>
        </div>
      )}
    </div>
  );
};

export default LinkedInSimple;
