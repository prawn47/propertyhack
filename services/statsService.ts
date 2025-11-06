import { authService } from './authService';
import { getApiUrl } from './apiConfig';

const API_BASE_URL = getApiUrl('/api');

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  weeklyProgress: number;
  weeklyTarget: number;
  postsThisWeek: number;
  lastPostDate: string | null;
}

// Helper function to handle API responses
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

/**
 * Gets user streak and weekly statistics
 */
export const getStreakStats = async (): Promise<StreakStats> => {
  try {
    const response = await authService.makeAuthenticatedRequest(`${API_BASE_URL}/stats/streak`);
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Failed to get streak stats:', error);
    throw error;
  }
};
