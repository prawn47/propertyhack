/**
 * API Configuration
 * Handles API URL based on environment
 */

// Get API URL from environment or fallback to proxy in development
export const API_URL = import.meta.env.VITE_API_URL || '';

// Helper to construct full API endpoint
export const getApiUrl = (path: string): string => {
  // In development, use proxy (relative path)
  if (!API_URL) {
    return path;
  }
  
  // In production, use full URL
  return `${API_URL}${path}`;
};

export default {
  API_URL,
  getApiUrl
};
