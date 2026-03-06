import { getApiUrl } from './apiConfig';
import authService from './authService';

const BASE = getApiUrl('/api/admin/dashboard');

export interface DashboardData {
  articles: {
    total: number;
    last24h: number;
    last7d: number;
    last30d: number;
    byStatus: {
      DRAFT: number;
      PUBLISHED: number;
      ARCHIVED: number;
    };
    byCategory: Array<{ category: string; count: number }>;
  };
  sources: {
    total: number;
    active: number;
    paused: number;
    withErrors: number;
    topByArticleCount: Array<{ id: string; name: string; articleCount: number }>;
  };
  ingestionHealth: {
    perSource: Array<{
      id: string;
      name: string;
      isActive: boolean;
      lastFetchAt: string | null;
      consecutiveFailures: number;
      lastError: string | null;
      articleCount: number;
    }>;
    recentLogs: Array<{
      id: string;
      sourceId: string;
      sourceName: string;
      status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
      articlesFound: number;
      articlesNew: number;
      errorMessage: string | null;
      duration: number;
      createdAt: string;
    }>;
  };
  health: {
    staleSources: Array<{ id: string; name: string; lastFetchAt: string | null }>;
    sourcesWithErrors: number;
  };
}

async function request<T>(url: string): Promise<T> {
  const response = await authService.makeAuthenticatedRequest(url);
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const err = await response.json();
      message = err.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return response.json();
}

export async function getDashboard(): Promise<DashboardData> {
  return request<DashboardData>(BASE);
}
