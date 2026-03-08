import { getApiUrl } from './apiConfig';
import authService from './authService';

const API_BASE = getApiUrl('/api/user');

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'user';
  googleId: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  newsletterOptIn: boolean;
  preferences: {
    defaultLocation?: string;
    defaultCategories?: string[];
    defaultDateRange?: string;
  } | null;
  scenarioCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdateData {
  displayName?: string;
  preferences?: {
    defaultLocation?: string;
    defaultCategories?: string[];
    defaultDateRange?: string;
  };
}

async function request(url: string, options: RequestInit = {}): Promise<Response> {
  return authService.makeAuthenticatedRequest(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
}

export async function getProfile(): Promise<UserProfile> {
  const res = await request(`${API_BASE}/profile`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch profile');
  }
  return res.json();
}

export async function updateProfile(data: ProfileUpdateData): Promise<UserProfile> {
  const res = await request(`${API_BASE}/profile`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update profile');
  }
  return res.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await request(`${API_BASE}/profile/password`, {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to change password');
  }
}

export async function toggleNewsletter(optIn: boolean): Promise<void> {
  const res = await request(`${API_BASE}/profile/newsletter`, {
    method: 'PUT',
    body: JSON.stringify({ optIn }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update newsletter preference');
  }
}

export async function deleteAccount(confirmation: string): Promise<void> {
  const res = await request(`${API_BASE}/profile`, {
    method: 'DELETE',
    body: JSON.stringify({ confirmation }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete account');
  }
}
