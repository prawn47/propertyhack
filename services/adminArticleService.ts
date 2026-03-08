import { getApiUrl } from './apiConfig';
import authService from './authService';

const BASE = getApiUrl('/api/admin/articles');

export interface Article {
  id: string;
  sourceId: string | null;
  sourceUrl: string;
  title: string;
  shortBlurb: string;
  longSummary: string;
  originalContent: string | null;
  imageUrl: string | null;
  imageAltText: string | null;
  slug: string;
  category: string;
  location: string | null;
  market: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured: boolean;
  isEvergreen: boolean;
  isGlobal: boolean;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  source: { id: string; name: string; type: string } | null;
}

export interface ArticleListResponse {
  articles: Article[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ArticleListParams {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  sourceId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ArticleUpdateData {
  title?: string;
  shortBlurb?: string;
  longSummary?: string;
  category?: string;
  location?: string;
  market?: string;
  isFeatured?: boolean;
  isEvergreen?: boolean;
  isGlobal?: boolean;
  status?: string;
  imageUrl?: string | null;
  imageAltText?: string;
}

export interface ManualArticleData {
  url?: string;
  title?: string;
  shortBlurb?: string;
  longSummary?: string;
  sourceUrl?: string;
  category?: string;
  market?: string;
  imageUrl?: string;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authService.makeAuthenticatedRequest(url, options);
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

export async function getArticles(params: ArticleListParams = {}): Promise<ArticleListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  if (params.category) qs.set('category', params.category);
  if (params.sourceId) qs.set('sourceId', params.sourceId);
  if (params.search) qs.set('search', params.search);
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
  const url = qs.toString() ? `${BASE}?${qs}` : BASE;
  return request<ArticleListResponse>(url);
}

export async function getArticle(id: string): Promise<Article & { needsReembedding?: boolean }> {
  return request<Article>(`${BASE}/${id}`);
}

export async function updateArticle(id: string, data: ArticleUpdateData): Promise<Article & { needsReembedding?: boolean }> {
  return request(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function createManualArticle(data: ManualArticleData): Promise<Article> {
  return request(`${BASE}/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function archiveArticle(id: string): Promise<{ success: boolean }> {
  return request(`${BASE}/${id}`, { method: 'DELETE' });
}

export async function bulkAction(ids: string[], action: 'publish' | 'archive' | 'delete'): Promise<{ updated: number }> {
  return request(`${BASE}/bulk`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, action }),
  });
}

export async function generateSocialPosts(articleId: string, platforms?: string[]): Promise<any> {
  const body: any = {};
  if (platforms) body.platforms = platforms;
  return request(`${BASE}/${articleId}/generate-social-posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
