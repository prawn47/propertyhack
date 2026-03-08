import React, { useEffect, useRef } from 'react';
import HenryMessageBubble from './HenryMessageBubble';
import HenryInput from './HenryInput';
import HenryDisclaimer from './HenryDisclaimer';

interface Citation {
  articleId: string;
  title: string;
  slug: string;
  similarity: number;
}

interface CalculatorCall {
  type: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  calculatorCall?: CalculatorCall;
  isStreaming?: boolean;
}

interface HenryChatWindowProps {
  messages: Message[];
  isStreaming: boolean;
  isThinking: boolean;
  error: string | null;
  onSendMessage: (content: string) => Promise<void>;
  onRateMessage: (id: string, rating: 1 | 5) => Promise<void>;
  compact?: boolean;
}

const SUGGESTED_QUESTIONS = [
  'What are property prices doing in Sydney right now?',
  'How much can I borrow on a $120k salary?',
  'What is stamp duty on a $800k property in Victoria?',
  'Is it better to rent or buy in the current market?',
];

export default function HenryChatWindow({
  messages,
  isStreaming,
  isThinking,
  error,
  onSendMessage,
  onRateMessage,
  compact = false,
}: HenryChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Disclaimer */}
      {!compact && <HenryDisclaimer />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-gold flex items-center justify-center text-brand-primary text-xl font-bold mb-4 flex-shrink-0">
              H
            </div>
            <h2 className="text-lg font-semibold text-content mb-1">Hi, I'm Henry</h2>
            <p className="text-sm text-content-secondary mb-6 max-w-xs">
              Your property AI assistant. Ask me anything about the market, mortgages, stamp duty, and more.
            </p>
            {!compact && (
              <div className="w-full max-w-sm space-y-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => onSendMessage(q)}
                    className="w-full text-left text-sm px-4 py-3 rounded-xl border border-base-300 bg-white hover:border-brand-gold/40 hover:bg-base-200 transition-colors text-content"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {compact && (
              <div className="w-full space-y-2">
                {SUGGESTED_QUESTIONS.slice(0, 2).map((q) => (
                  <button
                    key={q}
                    onClick={() => onSendMessage(q)}
                    className="w-full text-left text-xs px-3 py-2.5 rounded-xl border border-base-300 bg-white hover:border-brand-gold/40 hover:bg-base-200 transition-colors text-content"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={`px-3 py-4 space-y-1 ${compact ? 'sm:px-4' : 'sm:px-6'}`}>
            {messages.map((message) => (
              <HenryMessageBubble
                key={message.id}
                message={message}
                onRate={onRateMessage}
                compact={compact}
              />
            ))}

            {/* Thinking indicator */}
            {isThinking && (
              <div className="flex justify-start mb-3">
                <div className="bg-base-200 rounded-2xl px-4 py-3 text-sm text-content-secondary flex items-center gap-2">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-content-secondary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-content-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-content-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <HenryInput
          onSend={onSendMessage}
          disabled={isStreaming || isThinking}
          compact={compact}
        />
      </div>
    </div>
  );
}
