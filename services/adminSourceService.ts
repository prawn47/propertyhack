import { getApiUrl } from './apiConfig';
import authService from './authService';

const BASE = getApiUrl('/api/admin/sources');

export interface IngestionSource {
  id: string;
  name: string;
  type: SourceType;
  config: Record<string, unknown>;
  market: string;
  category: string | null;
  schedule: string | null;
  isActive: boolean;
  lastFetchAt: string | null;
  lastError: string | null;
  errorCount: number;
  articleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IngestionLog {
  id: string;
  sourceId: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  articlesFound: number;
  articlesNew: number;
  errorMessage: string | null;
  duration: number;
  createdAt: string;
}

export interface LogsResponse {
  logs: IngestionLog[];
  total: number;
  page: number;
  totalPages: number;
}

export type SourceType =
  | 'RSS'
  | 'NEWSAPI_ORG'
  | 'NEWSAPI_AI'
  | 'PERPLEXITY'
  | 'NEWSLETTER'
  | 'SCRAPER'
  | 'SOCIAL'
  | 'MANUAL';

export interface SourceListParams {
  type?: SourceType;
  isActive?: boolean;
}

export interface CreateSourceData {
  name: string;
  type: SourceType;
  config: Record<string, unknown>;
  market?: string;
  category?: string;
  schedule?: string;
  isActive?: boolean;
}

export interface UpdateSourceData {
  name?: string;
  config?: Record<string, unknown>;
  market?: string;
  category?: string;
  schedule?: string;
  isActive?: boolean;
}

export interface DuplicateSourceInfo {
  id: string;
  name: string;
  type: string;
}

export class DuplicateSourceError extends Error {
  existingSource: DuplicateSourceInfo;
  constructor(existingSource: DuplicateSourceInfo) {
    super(`Duplicate source: ${existingSource.name}`);
    this.existingSource = existingSource;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authService.makeAuthenticatedRequest(url, options);
  if (!response.ok) {
    if (response.status === 409) {
      try {
        const body = await response.json();
        if (body.duplicate && body.existingSource) {
          throw new DuplicateSourceError(body.existingSource);
        }
      } catch (e) {
        if (e instanceof DuplicateSourceError) throw e;
      }
    }
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

export async function getSources(params: SourceListParams = {}): Promise<IngestionSource[]> {
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  if (params.isActive !== undefined) qs.set('isActive', String(params.isActive));
  const url = qs.toString() ? `${BASE}?${qs}` : BASE;
  return request<IngestionSource[]>(url);
}

export async function getSource(id: string): Promise<IngestionSource & { logs: IngestionLog[] }> {
  return request<IngestionSource & { logs: IngestionLog[] }>(`${BASE}/${id}`);
}

export async function createSource(data: CreateSourceData): Promise<IngestionSource> {
  return request<IngestionSource>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateSource(id: string, data: UpdateSourceData): Promise<IngestionSource> {
  return request<IngestionSource>(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteSource(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`${BASE}/${id}`, { method: 'DELETE' });
}

export async function triggerFetch(id: string): Promise<{ queued: boolean; message: string }> {
  return request<{ queued: boolean; message: string }>(`${BASE}/${id}/fetch`, { method: 'POST' });
}

export async function getSourceLogs(id: string, params: { page?: number; limit?: number } = {}): Promise<LogsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const url = qs.toString() ? `${BASE}/${id}/logs?${qs}` : `${BASE}/${id}/logs`;
  return request<LogsResponse>(url);
}
