import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

interface HenryMessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    citations?: Citation[];
    calculatorCall?: CalculatorCall;
    isStreaming?: boolean;
  };
  onRate?: (messageId: string, rating: 1 | 5) => void;
  compact?: boolean;
}

function formatOutputValue(value: unknown): string {
  if (typeof value === 'number') {
    if (value > 1000) {
      return value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
    }
    if (value < 1 && value > 0) {
      return `${(value * 100).toFixed(2)}%`;
    }
    return value.toLocaleString();
  }
  return String(value);
}

function formatCalculatorType(type: string): string {
  const labels: Record<string, string> = {
    mortgage: 'Mortgage Estimate',
    borrowing_power: 'Borrowing Power',
    stamp_duty: 'Stamp Duty',
    rental_yield: 'Rental Yield',
    rent_vs_buy: 'Rent vs Buy',
    buying_costs: 'Buying Costs',
  };
  return labels[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const markdownComponents = {
  a: ({ href, children }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-gold hover:underline">
      {children}
    </a>
  ),
  p: ({ children }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: React.OlHTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>
  ),
  code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
    inline ? (
      <code className="bg-gray-100 rounded px-1 text-xs font-mono">{children}</code>
    ) : (
      <code>{children}</code>
    ),
  pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="bg-gray-800 text-gray-100 rounded-lg p-3 overflow-x-auto text-xs mb-2">{children}</pre>
  ),
  strong: ({ children }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold">{children}</strong>
  ),
};

export default function HenryMessageBubble({ message, onRate, compact }: HenryMessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<1 | 5 | null>(null);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const paddingClass = compact ? 'px-3 py-2' : 'px-4 py-3';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  function handleRate(value: 1 | 5) {
    setRating(value);
    onRate?.(message.id, value);
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {/* 90% max-width on mobile, 80% on larger screens */}
      <div className="relative max-w-[90%] sm:max-w-[80%] group w-full sm:w-auto">
        {/* Copy button — always visible on mobile (no hover on touch), hover-only on desktop */}
        {isAssistant && (
          <button
            onClick={handleCopy}
            className="absolute -top-2 right-2 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity bg-white border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:border-gray-300 z-10 flex items-center gap-1 min-h-[32px]"
            title="Copy message"
          >
            {copied ? (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        )}

        {/* Message bubble */}
        <div
          className={[
            'rounded-2xl text-sm',
            paddingClass,
            isUser
              ? 'bg-brand-primary text-white'
              : 'bg-base-200 text-gray-900',
          ].join(' ')}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-0.5 h-4 ml-0.5 bg-current align-middle animate-blink" />
              )}
            </>
          )}
        </div>

        {/* Citations — stack vertically, each full-width of bubble */}
        {isAssistant && message.citations && message.citations.length > 0 && (
          <div className="mt-2 space-y-1.5 text-xs">
            {message.citations.map((citation) => (
              <a
                key={citation.articleId}
                href={`/au/article/${citation.slug}`}
                className="block border border-brand-gold/20 bg-white rounded-lg px-3 py-2.5 hover:border-brand-gold/40 hover:bg-base-200 transition-colors min-h-[44px] flex flex-col justify-center"
              >
                <div className="font-medium text-gray-800 line-clamp-2">{citation.title}</div>
                <div className="text-gray-400 mt-0.5 flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6m-6 4h2" />
                  </svg>
                  PropertyHack
                  {citation.similarity >= 0.7 && (
                    <span className="ml-1 text-brand-gold font-medium">· Highly relevant</span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Calculator result */}
        {isAssistant && message.calculatorCall && (
          <div className="mt-2 border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-xs">
            <div className="font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-brand-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {formatCalculatorType(message.calculatorCall.type)}
            </div>
            <dl className="space-y-1">
              {Object.entries(message.calculatorCall.outputs).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-2 flex-wrap">
                  <dt className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</dt>
                  <dd className="font-medium text-gray-800">{formatOutputValue(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Thumbs up/down — larger tap targets on mobile */}
        {isAssistant && !message.isStreaming && (
          <div className="flex justify-end gap-0.5 mt-1.5">
            <button
              onClick={() => handleRate(5)}
              title="Helpful"
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded transition-colors ${
                rating === 5
                  ? 'text-green-600 bg-green-50'
                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              <svg className="w-4 h-4" fill={rating === 5 ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </button>
            <button
              onClick={() => handleRate(1)}
              title="Not helpful"
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded transition-colors ${
                rating === 1
                  ? 'text-red-500 bg-red-50'
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
            >
              <svg className="w-4 h-4" fill={rating === 1 ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
