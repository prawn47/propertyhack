import React, { useEffect, useRef, useState } from 'react';
import HenryInput from './HenryInput';
import HenryDisclaimer from './HenryDisclaimer';
import type { UseHenryReturn } from '../../hooks/useHenry';

type Message = UseHenryReturn['messages'][number];

interface HenryChatWindowProps {
  messages: Message[];
  isStreaming: boolean;
  isThinking: boolean;
  error: string | null;
  onSendMessage: (content: string) => void;
  onRateMessage?: (messageId: string, rating: 1 | 5) => void;
  compact?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "What's happening in the Sydney property market?",
  'How much can I borrow on a $120k salary?',
  'What are the latest auction clearance rates?',
  "What's stamp duty on a $800k house in NSW?",
];

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-2 animate-fade-in">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-gold flex items-center justify-center text-brand-primary text-xs font-bold">
        H
      </div>
      <div className="bg-base-200 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-5">
          <span className="w-2 h-2 rounded-full bg-content-secondary animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-content-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-content-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onRate,
}: {
  message: Message;
  onRate?: (messageId: string, rating: 1 | 5) => void;
}) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[80%] bg-brand-primary text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 animate-fade-in">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-gold flex items-center justify-center text-brand-primary text-xs font-bold">
        H
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-base-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-content">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-content-secondary ml-0.5 animate-pulse align-text-bottom" />
          )}
        </div>
        {!message.isStreaming && message.content && onRate && (
          <div className="flex gap-1 mt-1 ml-1">
            <button
              type="button"
              onClick={() => onRate(message.id, 5)}
              aria-label="Helpful"
              className={`p-1 rounded transition-colors ${
                message.rating === 5
                  ? 'text-brand-gold'
                  : 'text-content-secondary hover:text-brand-gold'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill={message.rating === 5 ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onRate(message.id, 1)}
              aria-label="Not helpful"
              className={`p-1 rounded transition-colors ${
                message.rating === 1
                  ? 'text-red-500'
                  : 'text-content-secondary hover:text-red-400'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill={message.rating === 1 ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onSuggest, compact }: { onSuggest: (q: string) => void; compact?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 text-center animate-fade-in-up">
      <div className={`rounded-full bg-brand-gold flex items-center justify-center text-brand-primary font-bold mb-4 ${compact ? 'w-10 h-10 text-base' : 'w-14 h-14 text-xl'}`}>
        H
      </div>
      <h2 className={`font-semibold text-content mb-2 ${compact ? 'text-base' : 'text-xl'}`}>
        Hi, I'm Henry
      </h2>
      <p className={`text-content-secondary mb-6 max-w-xs ${compact ? 'text-xs' : 'text-sm'}`}>
        Your property information assistant. Ask me about market trends, property news, or get calculator estimates.
      </p>
      <div className="flex flex-col gap-2 w-full max-w-sm">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onSuggest(q)}
            className={`text-left bg-white border border-base-300 rounded-xl px-4 hover:border-brand-gold hover:bg-amber-50 transition-colors text-content-secondary hover:text-content ${compact ? 'py-2 text-xs' : 'py-2.5 text-sm'}`}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function HenryChatWindow({
  messages,
  isStreaming,
  isThinking,
  error,
  onSendMessage,
  onRateMessage,
  compact = false,
}: HenryChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isThinking]);

  const visibleError = error !== dismissedError ? error : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className={compact ? 'px-3 pt-2 pb-1' : 'px-4 pt-3 pb-2'}>
        <HenryDisclaimer compact={compact} />
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0"
      >
        {messages.length === 0 && !isThinking ? (
          <EmptyState onSuggest={onSendMessage} compact={compact} />
        ) : (
          <div className={`flex flex-col gap-4 ${compact ? 'px-3 py-3' : 'px-4 py-4'}`}>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onRate={onRateMessage}
              />
            ))}
            {isThinking && <ThinkingIndicator />}
          </div>
        )}
      </div>

      {visibleError && (
        <div className={`mx-4 mb-2 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`} role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="flex-1">{visibleError}</span>
          <button
            type="button"
            onClick={() => setDismissedError(error)}
            aria-label="Dismiss error"
            className="shrink-0 hover:text-red-900 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className={`shrink-0 border-t border-base-300 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
        <HenryInput
          onSend={onSendMessage}
          disabled={isStreaming}
        />
      </div>
    </div>
  );
}
