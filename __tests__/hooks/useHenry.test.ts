import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHenry } from '../../hooks/useHenry';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: false })),
}));

vi.mock('../../services/henryService', () => ({
  streamChat: vi.fn(),
  streamMessage: vi.fn(),
  createConversation: vi.fn(),
  listConversations: vi.fn(),
  getConversation: vi.fn(),
  deleteConversation: vi.fn(),
  rateMessage: vi.fn(),
}));

import { useAuth } from '../../contexts/AuthContext';
import * as henryService from '../../services/henryService';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockStreamChat = henryService.streamChat as ReturnType<typeof vi.fn>;
const mockStreamMessage = henryService.streamMessage as ReturnType<typeof vi.fn>;
const mockRateMessage = henryService.rateMessage as ReturnType<typeof vi.fn>;

describe('useHenry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
  });

  it('has correct initial state', () => {
    const { result } = renderHook(() => useHenry());
    expect(result.current.messages).toEqual([]);
    expect(result.current.activeConversationId).toBeNull();
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.isThinking).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sendMessage adds user message optimistically', async () => {
    mockStreamChat.mockResolvedValue(undefined);

    const { result } = renderHook(() => useHenry());

    await act(async () => {
      result.current.sendMessage('Hello Henry');
    });

    const messages = result.current.messages;
    expect(messages.length).toBeGreaterThanOrEqual(1);
    const userMsg = messages.find((m) => m.role === 'user');
    expect(userMsg).toBeDefined();
    expect(userMsg?.content).toBe('Hello Henry');
  });

  it('sendMessage adds assistant placeholder and sets isStreaming', async () => {
    let streamingDuringCall = false;
    mockStreamChat.mockImplementation(async () => {
      streamingDuringCall = true;
    });

    const { result } = renderHook(() => useHenry());

    await act(async () => {
      result.current.sendMessage('What are rates?');
    });

    expect(streamingDuringCall).toBe(true);
  });

  it('sendMessage sets isStreaming to false after receiving done event', async () => {
    // Simulate stream that emits a done event then resolves
    mockStreamChat.mockImplementation(async (_msg: string, onEvent: (e: { event: string; data: unknown }) => void) => {
      onEvent({ event: 'done', data: { messageId: 'msg-1', tokenCount: 42, citations: [] } });
    });

    const { result } = renderHook(() => useHenry());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.isStreaming).toBe(false);
  });

  it('newConversation resets messages and activeConversationId', async () => {
    mockStreamChat.mockResolvedValue(undefined);

    const { result } = renderHook(() => useHenry());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => {
      result.current.newConversation();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.activeConversationId).toBeNull();
  });

  it('newConversation also clears error and streaming state', async () => {
    mockStreamChat.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useHenry());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.newConversation();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.isThinking).toBe(false);
  });

  it('rateMessage calls henryService.rateMessage with correct args', async () => {
    mockRateMessage.mockResolvedValue(undefined);

    const { result } = renderHook(() => useHenry());

    await act(async () => {
      await result.current.rateMessage('msg-123', 5);
    });

    expect(mockRateMessage).toHaveBeenCalledWith('msg-123', 5);
  });

  it('rateMessage updates local message rating optimistically', async () => {
    mockRateMessage.mockResolvedValue(undefined);
    mockStreamChat.mockResolvedValue(undefined);

    const { result } = renderHook(() => useHenry());

    // seed a message manually
    await act(async () => {
      await result.current.sendMessage('test');
    });

    const msgBefore = result.current.messages[0];

    await act(async () => {
      await result.current.rateMessage(msgBefore.id, 1);
    });

    const msgAfter = result.current.messages.find((m) => m.id === msgBefore.id);
    expect(msgAfter?.rating).toBe(1);
  });

  it('uses streamMessage when authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    const mockCreateConversation = henryService.createConversation as ReturnType<typeof vi.fn>;
    mockCreateConversation.mockResolvedValue({ id: 'conv-1', title: 'New Chat', createdAt: new Date().toISOString() });
    mockStreamMessage.mockResolvedValue(undefined);

    const { result } = renderHook(() => useHenry());

    await act(async () => {
      await result.current.sendMessage('Authenticated message');
    });

    expect(mockStreamMessage).toHaveBeenCalled();
    expect(mockStreamChat).not.toHaveBeenCalled();
  });

  it('uses streamChat when not authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    mockStreamChat.mockResolvedValue(undefined);

    const { result } = renderHook(() => useHenry());

    await act(async () => {
      await result.current.sendMessage('Anonymous message');
    });

    expect(mockStreamChat).toHaveBeenCalled();
    expect(mockStreamMessage).not.toHaveBeenCalled();
  });

  it('does not call sendMessage again while already streaming', async () => {
    let resolveStream: () => void;
    mockStreamChat.mockReturnValue(new Promise<void>((res) => { resolveStream = res; }));

    const { result } = renderHook(() => useHenry());

    act(() => {
      result.current.sendMessage('First message');
    });

    await waitFor(() => expect(result.current.isStreaming).toBe(true));

    await act(async () => {
      await result.current.sendMessage('Second message — should be ignored');
    });

    expect(mockStreamChat).toHaveBeenCalledTimes(1);

    // Cleanup
    act(() => resolveStream!());
  });

  it('sets error state on stream failure', async () => {
    mockStreamChat.mockRejectedValue(new Error('Connection failed'));

    const { result } = renderHook(() => useHenry());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.error).toBe('Connection failed');
    expect(result.current.isStreaming).toBe(false);
  });
});
