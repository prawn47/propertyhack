import { getApiUrl } from './apiConfig';
import authService from './authService';

const BASE = getApiUrl('/api/admin/agent-keys');

export interface AgentApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentApiKeyWithPlainKey extends AgentApiKey {
  plainKey: string;
}

export interface CreateKeyPayload {
  name: string;
  scopes: string[];
  expiresAt?: string;
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

export async function listKeys(): Promise<AgentApiKey[]> {
  const res = await authFetch(BASE);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createKey(data: CreateKeyPayload): Promise<AgentApiKeyWithPlainKey> {
  const res = await authFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function revokeKey(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

export interface AuditLogEntry {
  id: string;
  agentKeyName: string;
  method: string;
  path: string;
  requestSummary: Record<string, unknown> | null;
  responseStatus: number;
  durationMs: number;
  createdAt: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getAuditLog(params: {
  page?: number;
  limit?: number;
  keyName?: string;
  from?: string;
  to?: string;
}): Promise<AuditLogResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.keyName) qs.set('keyName', params.keyName);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const url = getApiUrl(`/api/admin/agent-audit?${qs.toString()}`);
  const res = await authFetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
