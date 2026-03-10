import { getApiUrl } from './apiConfig';
import authService from './authService';

const BASE = getApiUrl('/api/admin/seo');

export interface SeoKeyword {
  id: string;
  keyword: string;
  market: string | null;
  location: string | null;
  category: string | null;
  volume: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationSeo {
  id: string;
  location: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1Title: string;
  introContent: string | null;
  focusKeywords: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getKeywords(params?: { market?: string; location?: string; category?: string }): Promise<{ keywords: SeoKeyword[] }> {
  const query = new URLSearchParams();
  if (params?.market) query.set('market', params.market);
  if (params?.location) query.set('location', params.location);
  if (params?.category) query.set('category', params.category);
  const qs = query.toString();
  const res = await fetch(`${BASE}/keywords${qs ? `?${qs}` : ''}`, {
    headers: authService.getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch keywords: ${res.status}`);
  return res.json();
}

export async function createKeyword(data: Partial<SeoKeyword>): Promise<SeoKeyword> {
  const res = await fetch(`${BASE}/keywords`, {
    method: 'POST',
    headers: { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create keyword: ${res.status}`);
  return res.json();
}

export async function updateKeyword(id: string, data: Partial<SeoKeyword>): Promise<SeoKeyword> {
  const res = await fetch(`${BASE}/keywords/${id}`, {
    method: 'PUT',
    headers: { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update keyword: ${res.status}`);
  return res.json();
}

export async function deleteKeyword(id: string): Promise<void> {
  const res = await fetch(`${BASE}/keywords/${id}`, {
    method: 'DELETE',
    headers: authService.getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete keyword: ${res.status}`);
}

export async function getLocationSeoList(): Promise<{ locations: LocationSeo[] }> {
  const res = await fetch(`${BASE}/locations`, {
    headers: authService.getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch locations: ${res.status}`);
  return res.json();
}

export async function createLocationSeo(data: Partial<LocationSeo>): Promise<LocationSeo> {
  const res = await fetch(`${BASE}/locations`, {
    method: 'POST',
    headers: { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create location: ${res.status}`);
  return res.json();
}

export async function updateLocationSeo(id: string, data: Partial<LocationSeo>): Promise<LocationSeo> {
  const res = await fetch(`${BASE}/locations/${id}`, {
    method: 'PUT',
    headers: { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update location: ${res.status}`);
  return res.json();
}
