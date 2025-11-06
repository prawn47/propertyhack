import type { ScheduledPost } from '../types';
import { getApiUrl } from './apiConfig';

const API_BASE_URL = getApiUrl('/api');

export async function getScheduledPosts(): Promise<ScheduledPost[]> {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('No access token found');
  }

  const response = await fetch(`${API_BASE_URL}/posts/scheduled`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch scheduled posts');
  }

  return response.json();
}

export async function createScheduledPost(
  title: string,
  text: string,
  imageUrl: string | undefined,
  scheduledFor: string
): Promise<ScheduledPost> {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('No access token found');
  }

  const response = await fetch(`${API_BASE_URL}/posts/scheduled`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      text,
      imageUrl,
      scheduledFor,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create scheduled post');
  }

  return response.json();
}

export async function updateScheduledPost(
  id: string,
  updates: Partial<Pick<ScheduledPost, 'title' | 'text' | 'imageUrl' | 'scheduledFor'>>
): Promise<ScheduledPost> {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('No access token found');
  }

  const response = await fetch(`${API_BASE_URL}/posts/scheduled/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update scheduled post');
  }

  return response.json();
}

export async function cancelScheduledPost(id: string): Promise<void> {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('No access token found');
  }

  const response = await fetch(`${API_BASE_URL}/posts/scheduled/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel scheduled post');
  }
}
