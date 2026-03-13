import { getApiUrl } from './apiConfig';
import authService from './authService';

const BASE = getApiUrl('/api/admin/newsletters');

export type NewsletterStatus = 'DRAFT' | 'APPROVED' | 'SENT';

export type NewsletterCadence = 'DAILY' | 'EDITORIAL' | 'WEEKLY_ROUNDUP';

export interface NewsletterDraft {
  id: string;
  jurisdiction: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  articleIds: string[];
  status: NewsletterStatus;
  cadence: NewsletterCadence;
  globalSummary: string | null;
  heroImageUrl: string | null;
  topic: string | null;
  beehiivPostId: string | null;
  generatedAt: string;
  approvedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BeehiivStats {
  opens: number;
  clicks: number;
  subscribers_sent_to: number;
}

export interface NewsletterHistoryItem extends Pick<NewsletterDraft, 'id' | 'jurisdiction' | 'subject' | 'status' | 'beehiivPostId' | 'generatedAt' | 'approvedAt' | 'sentAt'> {
  stats: BeehiivStats | null;
}

export interface NewsletterHistoryResponse {
  drafts: NewsletterHistoryItem[];
  aggregate: {
    totalSent: number;
    avgOpenRate: number | null;
    avgClickRate: number | null;
  };
}

export interface NewsletterListResponse {
  drafts: NewsletterDraft[];
  total: number;
  page: number;
  totalPages: number;
}

export interface NewsletterListParams {
  page?: number;
  limit?: number;
  jurisdiction?: string;
  status?: NewsletterStatus;
  cadence?: NewsletterCadence;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = authService.getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers, credentials: 'include' });
}

export async function getNewsletters(params: NewsletterListParams = {}): Promise<NewsletterListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.jurisdiction) qs.set('jurisdiction', params.jurisdiction);
  if (params.status) qs.set('status', params.status);
  if (params.cadence) qs.set('cadence', params.cadence);
  const res = await authFetch(`${BASE}?${qs}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getNewsletterHistory(jurisdiction?: string): Promise<NewsletterHistoryResponse> {
  const qs = new URLSearchParams();
  if (jurisdiction) qs.set('jurisdiction', jurisdiction);
  const res = await authFetch(`${BASE}/history?${qs}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getNewsletter(id: string): Promise<NewsletterDraft> {
  const res = await authFetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateNewsletter(id: string, data: { subject?: string; htmlContent?: string; globalSummary?: string }): Promise<NewsletterDraft> {
  const res = await authFetch(`${BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteNewsletter(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

export async function approveNewsletter(id: string): Promise<NewsletterDraft> {
  const res = await authFetch(`${BASE}/${id}/approve`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateNewsletter(jurisdiction: string, cadence?: NewsletterCadence): Promise<{ message: string; draft: NewsletterDraft }> {
  const body: Record<string, string> = { jurisdiction };
  if (cadence) body.cadence = cadence;
  const res = await authFetch(`${BASE}/generate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function sendNewsletter(id: string): Promise<NewsletterDraft> {
  const res = await authFetch(`${BASE}/${id}/send`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
