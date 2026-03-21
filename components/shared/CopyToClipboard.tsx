import React, { useState, useCallback, useRef } from 'react';

interface CopyToClipboardProps {
  content: string;
  label?: string;
  format?: 'text' | 'html';
  onCopied?: () => void;
  className?: string;
  variant?: 'button' | 'icon';
}

const CopyToClipboard: React.FC<CopyToClipboardProps> = ({
  content,
  label = 'Copy',
  format = 'text',
  onCopied,
  className = '',
  variant = 'button',
}) => {
  const [hasCopied, setHasCopied] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyToClipboard = useCallback(async () => {
    try {
      if (format === 'html' && typeof ClipboardItem !== 'undefined') {
        const blob = new Blob([content], { type: 'text/html' });
        const item = new ClipboardItem({ 'text/html': blob });
        await navigator.clipboard.write([item]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setHasCopied(true);
      setShowFeedback(true);
      onCopied?.();

      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => setShowFeedback(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setHasCopied(true);
        setShowFeedback(true);
        onCopied?.();
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => setShowFeedback(false), 2000);
      } catch {
        console.error('Failed to copy to clipboard');
      }
      document.body.removeChild(textarea);
    }
  }, [content, format, onCopied]);

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={copyToClipboard}
        className={`inline-flex items-center justify-center p-1.5 rounded transition-colors ${
          showFeedback
            ? 'text-brand-gold'
            : 'text-content-secondary hover:text-brand-gold'
        } ${className}`}
        title={showFeedback ? 'Copied!' : label}
        aria-label={showFeedback ? 'Copied!' : label}
      >
        {showFeedback ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copyToClipboard}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
        showFeedback
          ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/30'
          : 'bg-base-200 text-content hover:bg-base-300 border border-base-300 hover:border-brand-gold/30'
      } ${className}`}
    >
      {showFeedback ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>Copied</span>
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span>{label}</span>
        </>
      )}
      {hasCopied && !showFeedback && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3.5 h-3.5 text-brand-gold"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
};

export default CopyToClipboard;
