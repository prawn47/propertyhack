import { getApiUrl } from './apiConfig';

export interface PublicArticle {
  id: string;
  sourceId: string | null;
  sourceUrl: string;
  title: string;
  shortBlurb: string | null;
  longSummary: string | null;
  imageUrl: string | null;
  imageAltText: string | null;
  slug: string;
  category: string | null;
  location: string | null;
  market: string;
  status: 'PUBLISHED';
  isFeatured: boolean;
  viewCount: number;
  publishedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  similarity?: number;
  source: { id: string; name: string; type: string } | null;
}

export interface ArticlesResponse {
  articles: PublicArticle[];
  total: number;
  page: number;
  totalPages: number;
}

export interface GetArticlesParams {
  search?: string;
  location?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'newest' | 'relevance';
  page?: number;
  limit?: number;
  country?: string;
}

export interface CategoriesResponse {
  categories: string[];
}

export interface LocationsResponse {
  locations: string[];
}

export async function getArticles(params: GetArticlesParams = {}): Promise<ArticlesResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.location) query.set('location', params.location);
  if (params.category) query.set('category', params.category);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.sort) query.set('sort', params.sort);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.country) query.set('country', params.country);

  const qs = query.toString();
  const url = getApiUrl(`/api/articles${qs ? `?${qs}` : ''}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch articles: ${res.status}`);
  return res.json();
}

export async function getCategories(): Promise<CategoriesResponse> {
  const res = await fetch(getApiUrl('/api/categories'));
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
  return res.json();
}

export async function getLocations(): Promise<LocationsResponse> {
  const res = await fetch(getApiUrl('/api/locations'));
  if (!res.ok) throw new Error(`Failed to fetch locations: ${res.status}`);
  return res.json();
}

export async function getPublicArticle(slug: string): Promise<PublicArticle> {
  const res = await fetch(getApiUrl(`/api/articles/${slug}`));
  if (res.status === 404) throw new Error('Article not found');
  if (!res.ok) throw new Error(`Failed to fetch article: ${res.status}`);
  return res.json();
}

export interface RelatedArticlesResponse {
  articles: PublicArticle[];
}

export async function getRelatedArticles(slug: string): Promise<RelatedArticlesResponse> {
  const res = await fetch(getApiUrl(`/api/articles/${slug}/related`));
  if (!res.ok) throw new Error(`Failed to fetch related articles: ${res.status}`);
  return res.json();
}
