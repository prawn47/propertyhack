/**
 * API Configuration
 * Handles API URL based on environment
 */

// Get API URL from environment or fallback to proxy in development
export const API_URL = import.meta.env.VITE_API_URL || '';

console.log('API_URL configured as:', API_URL);

// Helper to construct full API endpoint
export const getApiUrl = (path: string): string => {
  // In development, use proxy (relative path)
  if (!API_URL) {
    return path;
  }
  
  // In production, use full URL
  const fullUrl = `${API_URL}${path}`;
  console.log('API call to:', fullUrl);
  return fullUrl;
};

export default {
  API_URL,
  getApiUrl
};
