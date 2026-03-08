import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as henryService from '../services/henryService';
import type {
  Message,
  Conversation,
  HenryEvent,
  Citation,
  CalculatorCall,
} from '../services/henryService';

// Local message shape extends the persisted Message type to support streaming
interface LocalMessage extends Omit<Message, 'citations' | 'calculatorCall'> {
  citations: Citation[];
  calculatorCall: CalculatorCall | null;
  isStreaming?: boolean;
}

export interface UseHenryReturn {
  messages: LocalMessage[];
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  isThinking: boolean;
  error: string | null;

  sendMessage: (content: string) => Promise<void>;
  newConversation: () => void;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  rateMessage: (messageId: string, rating: 1 | 5) => Promise<void>;
  loadConversations: () => Promise<void>;
}

function makeOptimisticUserMessage(content: string): LocalMessage {
  return {
    id: `local-user-${Date.now()}`,
    conversationId: '',
    role: 'user',
    content,
    citations: [],
    calculatorCall: null,
    rating: null,
    tokenCount: null,
    createdAt: new Date().toISOString(),
  };
}

function makeAssistantPlaceholder(): LocalMessage {
  return {
    id: `local-assistant-${Date.now()}`,
    conversationId: '',
    role: 'assistant',
    content: '',
    citations: [],
    calculatorCall: null,
    rating: null,
    tokenCount: null,
    createdAt: new Date().toISOString(),
    isStreaming: true,
  };
}

export function useHenry(): UseHenryReturn {
  const { isAuthenticated } = useAuth();

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreaming) return;

      // Abort any in-flight stream
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      setError(null);
      setIsStreaming(true);
      setIsThinking(true);

      const userMsg = makeOptimisticUserMessage(content);
      const assistantMsg = makeAssistantPlaceholder();
      const assistantLocalId = assistantMsg.id;

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      const onEvent = (event: HenryEvent) => {
        switch (event.event) {
          case 'thinking':
            setIsThinking(true);
            break;

          case 'delta':
            setIsThinking(false);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantLocalId
                  ? { ...m, content: m.content + event.data.text }
                  : m
              )
            );
            break;

          case 'citation':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantLocalId
                  ? { ...m, citations: [...m.citations, event.data] }
                  : m
              )
            );
            break;

          case 'calculator':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantLocalId
                  ? { ...m, calculatorCall: event.data }
                  : m
              )
            );
            break;

          case 'done':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantLocalId
                  ? {
                      ...m,
                      id: event.data.messageId,
                      tokenCount: event.data.tokenCount,
                      citations: event.data.citations.length > 0 ? event.data.citations : m.citations,
                      isStreaming: false,
                    }
                  : m
              )
            );
            setIsStreaming(false);
            setIsThinking(false);
            break;

          case 'error':
            setError(event.data.message);
            setIsStreaming(false);
            setIsThinking(false);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantLocalId ? { ...m, isStreaming: false } : m
              )
            );
            break;
        }
      };

      const signal = abortRef.current?.signal;

      try {
        if (isAuthenticated) {
          let convId = activeConversationId;
          if (!convId) {
            const conv = await henryService.createConversation();
            convId = conv.id;
            setActiveConversationId(convId);
            setConversations((prev) => [
              { id: conv.id, title: conv.title, createdAt: conv.createdAt, updatedAt: conv.createdAt },
              ...prev,
            ]);
          }
          await henryService.streamMessage(convId, content, onEvent, signal);
        } else {
          await henryService.streamChat(content, onEvent, signal);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        const errMessage = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setError(errMessage);
        setIsStreaming(false);
        setIsThinking(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantLocalId ? { ...m, isStreaming: false } : m
          )
        );
      }
    },
    [isStreaming, isAuthenticated, activeConversationId]
  );

  const newConversation = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setMessages([]);
    setActiveConversationId(null);
    setError(null);
    setIsStreaming(false);
    setIsThinking(false);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setError(null);
    try {
      const conv = await henryService.getConversation(id);
      setActiveConversationId(id);
      setMessages(
        conv.messages.map((m) => ({
          ...m,
          citations: m.citations ?? [],
          calculatorCall: m.calculatorCall ?? null,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    }
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await henryService.deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          setMessages([]);
          setActiveConversationId(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete conversation');
      }
    },
    [activeConversationId]
  );

  const rateMessage = useCallback(async (messageId: string, rating: 1 | 5) => {
    setError(null);
    try {
      await henryService.rateMessage(messageId, rating);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, rating } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rate message');
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setError(null);
    try {
      const result = await henryService.listConversations();
      setConversations(result.conversations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    }
  }, []);

  return {
    messages,
    conversations,
    activeConversationId,
    isStreaming,
    isThinking,
    error,
    sendMessage,
    newConversation,
    loadConversation,
    deleteConversation,
    rateMessage,
    loadConversations,
  };
}
