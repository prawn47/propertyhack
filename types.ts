// Fix: Defining types and exporting them to resolve module errors.
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  superAdmin: boolean;
  createdAt: string;
  profilePictureUrl?: string;
  linkedinId?: string;
  linkedinAccessToken?: string;
  linkedinTokenExpiry?: string;
  linkedinConnected: boolean;
}

export interface UserSettings {
  id?: string;
  toneOfVoice: string;
  industry: string;
  position: string;
  audience: string;
  postGoal: string;
  keywords: string;
  contentExamples: string[];
  timeZone: string;
  preferredTime: string;
  profilePictureUrl?: string;
  englishVariant: 'American' | 'British' | 'Australian' | string;
  // News preferences
  newsCategories?: string[];
  newsLanguages?: string[];
  newsSources?: string[];
  newsCountries?: string[];
  updatedAt?: string;
}

export interface DraftPost {
  id: string;
  title: string;
  text: string;
  imageUrl?: string;
  isPublishing?: boolean; // New property to track publishing state
  createdAt?: string;
  updatedAt?: string;
}

export interface PublishedPost extends DraftPost {
  publishedAt: string;
}

export interface ScheduledPost {
  id: string;
  userId: string;
  title: string;
  text: string;
  imageUrl?: string;
  scheduledFor: string; // ISO date string
  status: 'scheduled' | 'published' | 'cancelled' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[]; // Maps to UserSettings field names
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewsArticle {
  id: string;
  userId: string;
  title: string;
  summary: string;
  content?: string;
  url: string;
  source: string;
  publishedAt?: string;
  fetchedAt: string;
  category?: string;
  relevanceScore?: number;
  isRead: boolean;
}

// ============================================
// PROPERTY HACK TYPES
// ============================================

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content?: string;
  sourceUrl: string;
  sourceName: string;
  sourceLogoUrl?: string;
  metaDescription: string;
  focusKeywords: string; // JSON array as string
  ogImage?: string;
  imageUrl?: string;
  imageAltText?: string;
  market: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  viewCount: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author?: {
    id: string;
    email: string;
    displayName?: string;
  };
  categoryId?: string;
  category?: ArticleCategory;
  sourceId?: string;
  source?: ArticleSource;
}

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  market: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleSource {
  id: string;
  name: string;
  url: string;
  logoUrl?: string;
  feedType: 'rss' | 'api' | 'manual';
  feedUrl?: string;
  apiKey?: string;
  isActive: boolean;
  autoImport: boolean;
  market: string;
  createdAt: string;
  updatedAt: string;
}

export interface Market {
  id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
