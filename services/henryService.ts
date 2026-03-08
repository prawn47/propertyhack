import { getApiUrl } from './apiConfig';
import authService from './authService';

// ============================================
// TYPES
// ============================================

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[] | null;
  calculatorCall: CalculatorCall | null;
  rating: 1 | 5 | null;
  tokenCount: number | null;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface Citation {
  articleId: string;
  title: string;
  slug: string;
  similarity: number;
}

export interface CalculatorCall {
  type: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  totalPages: number;
}

export type HenryEvent =
  | { event: 'thinking'; data: { phase: string } }
  | { event: 'delta'; data: { text: string } }
  | { event: 'citation'; data: Citation }
  | { event: 'calculator'; data: CalculatorCall }
  | { event: 'done'; data: { messageId: string; tokenCount: number; citations: Citation[] } }
  | { event: 'error'; data: { message: string } };

// ============================================
// HELPERS
// ============================================

function getAuthHeaders(required: true): { Authorization: string };
function getAuthHeaders(required?: false): Record<string, string>;
function getAuthHeaders(required = false): Record<string, string> {
  const token = authService.getAccessToken();
  if (!token && required) throw new Error('No access token available');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseSSEStream(
  response: Response,
  onEvent: (event: HenryEvent) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;

      let eventName = '';
      let dataLine = '';

      for (const line of chunk.split('\n')) {
        if (line.startsWith('event: ')) {
          eventName = line.slice('event: '.length).trim();
        } else if (line.startsWith('data: ')) {
          dataLine = line.slice('data: '.length).trim();
        }
      }

      if (!eventName || !dataLine) continue;

      try {
        const data = JSON.parse(dataLine);
        onEvent({ event: eventName, data } as HenryEvent);
      } catch {
        // Malformed SSE chunk — skip
      }
    }
  }
}

// ============================================
// REGULAR API CALLS
// ============================================

export async function createConversation(): Promise<{ id: string; title: string; createdAt: string }> {
  const response = await authService.makeAuthenticatedRequest(
    getApiUrl('/api/henry/conversations'),
    { method: 'POST' }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to create conversation');
  }
  return response.json();
}

export async function listConversations(
  page?: number,
  limit?: number
): Promise<ConversationsResponse> {
  const query = new URLSearchParams();
  if (page !== undefined) query.set('page', String(page));
  if (limit !== undefined) query.set('limit', String(limit));
  const qs = query.toString();

  const response = await authService.makeAuthenticatedRequest(
    getApiUrl(`/api/henry/conversations${qs ? `?${qs}` : ''}`)
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to list conversations');
  }
  return response.json();
}

export async function getConversation(id: string): Promise<ConversationWithMessages> {
  const response = await authService.makeAuthenticatedRequest(
    getApiUrl(`/api/henry/conversations/${id}`)
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to get conversation');
  }
  return response.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const response = await authService.makeAuthenticatedRequest(
    getApiUrl(`/api/henry/conversations/${id}`),
    { method: 'DELETE' }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to delete conversation');
  }
}

export async function rateMessage(messageId: string, rating: 1 | 5): Promise<void> {
  const response = await authService.makeAuthenticatedRequest(
    getApiUrl(`/api/henry/messages/${messageId}/rating`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to rate message');
  }
}

// ============================================
// SSE STREAMING CALLS
// ============================================

export async function streamChat(
  message: string,
  onEvent: (event: HenryEvent) => void
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const response = await fetch(getApiUrl('/api/henry/chat'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Chat request failed');
  }

  await parseSSEStream(response, onEvent);
}

export async function streamMessage(
  conversationId: string,
  message: string,
  onEvent: (event: HenryEvent) => void
): Promise<void> {
  const token = authService.getAccessToken();
  if (!token) throw new Error('No access token available');

  const response = await fetch(
    getApiUrl(`/api/henry/conversations/${conversationId}/messages`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Message request failed');
  }

  await parseSSEStream(response, onEvent);
}
