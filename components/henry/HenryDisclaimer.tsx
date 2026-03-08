import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'henry-disclaimer-dismissed';

interface HenryDisclaimerProps {
  compact?: boolean;
}

export default function HenryDisclaimer({ compact = false }: HenryDisclaimerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className={`flex items-start gap-2 bg-amber-50 text-amber-800 border border-amber-200 rounded ${
        compact ? 'px-3 py-2' : 'px-4 py-3'
      }`}
      role="note"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 text-amber-500 ${compact ? 'w-4 h-4 mt-px' : 'w-5 h-5 mt-0.5'}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"
        />
      </svg>
      <p className={`flex-1 ${compact ? 'text-xs' : 'text-sm'}`}>
        {compact
          ? 'General information only — not financial advice.'
          : 'Henry provides general property information only — not financial advice. Always consult a qualified professional before making property decisions.'}
      </p>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss disclaimer"
        className={`shrink-0 text-amber-500 hover:text-amber-700 transition-colors ${
          compact ? 'ml-1' : 'ml-2'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
