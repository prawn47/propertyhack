import { getApiUrl } from './apiConfig';
import authService from './authService';

const BASE = getApiUrl('/api/admin/newsletters');

export interface NewsletterDraft {
  id: string;
  jurisdiction: string;
  subject: string;
  status: 'DRAFT' | 'APPROVED' | 'SENT';
  generatedAt: string;
  approvedAt: string | null;
  sentAt: string | null;
  beehiivPostId: string | null;
}

export interface NewsletterListResponse {
  drafts: NewsletterDraft[];
  total: number;
  page: number;
  totalPages: number;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = authService.getAccessToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

export async function getNewsletters(params: {
  page?: number;
  limit?: number;
  jurisdiction?: string;
  status?: string;
}): Promise<NewsletterListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.jurisdiction) qs.set('jurisdiction', params.jurisdiction);
  if (params.status) qs.set('status', params.status);

  const res = await authFetch(`${BASE}?${qs}`);
  if (!res.ok) throw new Error('Failed to load newsletters');
  return res.json();
}

export async function deleteNewsletter(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete newsletter');
}

export async function generateNewsletter(jurisdiction: string): Promise<void> {
  const res = await authFetch(`${BASE}/generate`, {
    method: 'POST',
    body: JSON.stringify({ jurisdiction }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to trigger generation');
  }
}
