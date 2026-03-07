import { getApiUrl } from './apiConfig';
import authService from './authService';

const BASE = getApiUrl('/api/admin/prompts');

export interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePromptData {
  content?: string;
  description?: string;
  isActive?: boolean;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authService.makeAuthenticatedRequest(url, options);
  if (!response.ok) {
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

export async function getPrompts(): Promise<SystemPrompt[]> {
  return request<SystemPrompt[]>(BASE);
}

export async function getPrompt(id: string): Promise<SystemPrompt> {
  return request<SystemPrompt>(`${BASE}/${id}`);
}

export async function updatePrompt(id: string, data: UpdatePromptData): Promise<SystemPrompt> {
  return request<SystemPrompt>(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
