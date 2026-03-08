import React, { useRef, useEffect, useCallback } from 'react';

interface HenryInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_CHARS = 2000;
const CHAR_WARN_THRESHOLD = 1800;

const HenryInput: React.FC<HenryInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Ask Henry about property...',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState('');

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 24;
    const maxHeight = lineHeight * 4 + 24;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    adjustHeight();
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charCount = value.length;
  const showCharCount = charCount >= CHAR_WARN_THRESHOLD;
  const isOverLimit = charCount > MAX_CHARS;
  const canSend = value.trim().length > 0 && !disabled && !isOverLimit;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-2 bg-white border border-base-300 rounded-xl px-3 py-2.5 focus-within:border-brand-gold transition-colors shadow-soft">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={MAX_CHARS}
          rows={1}
          aria-label="Message Henry"
          className="flex-1 resize-none bg-transparent text-content text-sm leading-6 placeholder:text-content-secondary focus:outline-none disabled:opacity-50 overflow-y-auto"
          style={{ minHeight: '24px', maxHeight: '120px' }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-brand-gold text-brand-primary transition-opacity disabled:opacity-30 hover:enabled:opacity-90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </div>
      {showCharCount && (
        <p className={`text-xs text-right pr-1 ${isOverLimit ? 'text-red-500' : 'text-content-secondary'}`}>
          {charCount}/{MAX_CHARS}
        </p>
      )}
    </div>
  );
};

export default HenryInput;
