import authService from './authService';
import type { Article, ArticleCategory, ArticleSource } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ============================================
// ARTICLES
// ============================================

export async function getArticles(params?: {
  status?: string;
  market?: string;
  categoryId?: string;
  sourceId?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ articles: Article[]; total: number; limit: number; offset: number }> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.market) queryParams.append('market', params.market);
  if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
  if (params?.sourceId) queryParams.append('sourceId', params.sourceId);
  if (params?.featured !== undefined) queryParams.append('featured', params.featured.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/articles?${queryParams.toString()}`
  );
  return response.json();
}

export async function getArticle(id: string): Promise<Article> {
  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/articles/${id}`
  );
  return response.json();
}

export async function createArticle(data: Partial<Article>): Promise<Article> {
  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/articles`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  return response.json();
}

export async function updateArticle(id: string, data: Partial<Article>): Promise<Article> {
  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/articles/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  return response.json();
}

export async function publishArticle(id: string): Promise<Article> {
  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/articles/${id}/publish`,
    {
      method: 'POST',
    }
  );
  return response.json();
}

export async function deleteArticle(id: string): Promise<void> {
  await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/articles/${id}`,
    {
      method: 'DELETE',
    }
  );
}

// ============================================
// AI GENERATION
// ============================================

export async function generateSummary(params: {
  sourceContent: string;
  focusKeywords?: string[];
  sourceUrl?: string;
  market?: string;
}): Promise<{ title: string; slug: string; summary: string; metaDescription: string }> {
  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/articles/generate-summary`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }
  );
  return response.json();
}

export async function generateAltText(params: {
  title: string;
  summary: string;
  focusKeywords?: string[];
}): Promise<{ altText: string }> {
  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/articles/generate-alt-text`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }
  );
  return response.json();
}

// ============================================
// CATEGORIES
// ============================================

export async function getCategories(market?: string): Promise<ArticleCategory[]> {
  const queryParams = market ? `?market=${market}` : '';
  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/meta/categories${queryParams}`
  );
  return response.json();
}

export async function createCategory(data: Partial<ArticleCategory>): Promise<ArticleCategory> {
  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/meta/categories`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  return response.json();
}

export async function updateCategory(id: string, data: Partial<ArticleCategory>): Promise<ArticleCategory> {
  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/meta/categories/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  return response.json();
}

export async function deleteCategory(id: string): Promise<void> {
  await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/meta/categories/${id}`,
    {
      method: 'DELETE',
    }
  );
}

// ============================================
// SOURCES
// ============================================

export async function getSources(market?: string, isActive?: boolean): Promise<ArticleSource[]> {
  const queryParams = new URLSearchParams();
  if (market) queryParams.append('market', market);
  if (isActive !== undefined) queryParams.append('isActive', isActive.toString());
  
  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/meta/sources?${queryParams.toString()}`
  );
  return response.json();
}

export async function getSource(id: string): Promise<ArticleSource> {
  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/meta/sources/${id}`
  );
  return response.json();
}

export async function createSource(data: Partial<ArticleSource>): Promise<ArticleSource> {
  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/meta/sources`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  return response.json();
}

export async function updateSource(id: string, data: Partial<ArticleSource>): Promise<ArticleSource> {
  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/meta/sources/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  return response.json();
}

export async function deleteSource(id: string): Promise<void> {
  await authService.makeAuthenticatedRequest(
    `${API_BASE}/api/admin/meta/sources/${id}`,
    {
      method: 'DELETE',
    }
  );
}
