import React, { useRef, useState, useEffect } from 'react';

interface HenryInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  compact?: boolean;
}

export default function HenryInput({ onSend, disabled = false, compact = false }: HenryInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSend(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Desktop: Enter sends, Shift+Enter newline
    // Mobile: never auto-send on Enter (virtual keyboard sends Enter as newline)
    if (e.key === 'Enter' && !e.shiftKey && !isMobile()) {
      e.preventDefault();
      handleSend();
    }
  }

  function isMobile(): boolean {
    return window.matchMedia('(pointer: coarse)').matches;
  }

  const canSend = value.trim().length > 0 && !disabled;
  const padding = compact ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className={`border-t border-base-300 bg-white ${padding}`}>
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Henry anything..."
          rows={1}
          disabled={disabled}
          className={[
            'flex-1 resize-none rounded-xl border border-base-300 bg-base-200 text-content placeholder-content-secondary',
            'focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold/60',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'leading-relaxed overflow-y-hidden',
            compact ? 'text-sm px-3 py-2' : 'text-sm px-3 py-2.5',
          ].join(' ')}
          style={{ minHeight: compact ? '36px' : '42px', maxHeight: '120px' }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={[
            'flex-shrink-0 rounded-xl bg-brand-gold text-brand-primary font-semibold transition-all duration-150',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'enabled:hover:brightness-110 enabled:active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1',
            // Min 44px tap target on all screen sizes
            'min-w-[44px] min-h-[44px] flex items-center justify-center',
          ].join(' ')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
      {!compact && (
        <p className="text-xs text-content-secondary mt-1.5 text-center">
          Henry may make mistakes. Always verify important information.
        </p>
      )}
    </div>
  );
}
