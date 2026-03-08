import { getApiUrl } from './apiConfig';
import authService from './authService';

const BASE = getApiUrl('/api/admin/social-posts');

export type SocialPostStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';
export type SocialPlatform = 'twitter' | 'facebook' | 'linkedin' | 'instagram';

export interface SocialPostArticle {
  id: string;
  title: string;
  slug: string;
}

export interface SocialPost {
  id: string;
  content: string;
  imageUrl: string | null;
  platforms: SocialPlatform[];
  articleId: string | null;
  article: SocialPostArticle | null;
  status: SocialPostStatus;
  scheduledFor: string | null;
  publishedAt: string | null;
  platformResults: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialPostListResponse {
  posts: SocialPost[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SocialPostListParams {
  page?: number;
  limit?: number;
  status?: SocialPostStatus;
  platform?: SocialPlatform | '';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface SocialPostStats {
  thisWeek: number;
  byPlatform: Record<SocialPlatform, number>;
  failed: number;
}

export interface SocialPostData {
  content: string;
  platforms: SocialPlatform[];
  imageUrl?: string | null;
  articleId?: string | null;
  scheduledFor?: string | null;
}

export interface SocialPostPreviewData {
  content: string;
  platforms: SocialPlatform[];
  imageUrl?: string | null;
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

export async function getSocialPosts(params: SocialPostListParams = {}): Promise<SocialPostListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  if (params.platform) qs.set('platform', params.platform);
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  if (params.search) qs.set('search', params.search);
  const url = qs.toString() ? `${BASE}?${qs}` : BASE;
  return request<SocialPostListResponse>(url);
}

export async function getSocialPostStats(): Promise<SocialPostStats> {
  return request<SocialPostStats>(`${BASE}/stats`);
}

export async function retrySocialPost(id: string): Promise<SocialPost> {
  return request<SocialPost>(`${BASE}/${id}/retry`, { method: 'POST' });
}

export async function approveSocialPost(id: string): Promise<SocialPost> {
  return request<SocialPost>(`${BASE}/${id}/approve`, { method: 'POST' });
}

export async function getSocialPost(id: string): Promise<SocialPost> {
  return request<SocialPost>(`${BASE}/${id}`);
}

export async function createSocialPost(data: SocialPostData): Promise<SocialPost> {
  return request<SocialPost>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateSocialPost(id: string, data: Partial<SocialPostData>): Promise<SocialPost> {
  return request<SocialPost>(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteSocialPost(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`${BASE}/${id}`, { method: 'DELETE' });
}

export async function publishSocialPost(id: string): Promise<SocialPost> {
  return request<SocialPost>(`${BASE}/${id}/publish`, { method: 'POST' });
}

export async function previewSocialPost(data: SocialPostPreviewData): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(`${BASE}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
