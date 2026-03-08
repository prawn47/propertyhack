import { getApiUrl } from './apiConfig';

const API_BASE = getApiUrl('/api');

export interface Scenario {
  id: string;
  name: string;
  calculatorType: string;
  market: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  headlineLabel: string;
  headlineValue: string;
  createdAt: string;
  updatedAt: string;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function listScenarios(params?: { type?: string; market?: string; search?: string }): Promise<Scenario[]> {
  const url = new URL(`${API_BASE}/scenarios`, window.location.origin);
  if (params?.type) url.searchParams.set('type', params.type);
  if (params?.market) url.searchParams.set('market', params.market);
  if (params?.search) url.searchParams.set('search', params.search);
  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
  });
  return handleResponse<Scenario[]>(res);
}

export async function getScenario(id: string): Promise<Scenario> {
  const res = await fetch(`${API_BASE}/scenarios/${id}`, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
  });
  return handleResponse<Scenario>(res);
}

export async function createScenario(
  data: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Scenario> {
  const res = await fetch(`${API_BASE}/scenarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  return handleResponse<Scenario>(res);
}

export async function renameScenario(id: string, name: string): Promise<Scenario> {
  const res = await fetch(`${API_BASE}/scenarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ name }),
  });
  return handleResponse<Scenario>(res);
}

export async function duplicateScenario(id: string): Promise<Scenario> {
  const res = await fetch(`${API_BASE}/scenarios/${id}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
  });
  return handleResponse<Scenario>(res);
}

export async function deleteScenario(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/scenarios/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
  });
  if (!res.ok) {
    let message = 'Delete failed';
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
}
