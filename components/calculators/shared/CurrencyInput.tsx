import React, { useState, useEffect, useId } from 'react';

interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (valueCents: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}

function formatCurrency(cents: number): string {
  const dollars = Math.round(cents) / 100;
  return dollars.toLocaleString('en-AU', { maximumFractionDigits: 0 });
}

function parseCurrency(raw: string): number {
  const stripped = raw.replace(/[^0-9.]/g, '');
  const dollars = parseFloat(stripped) || 0;
  return Math.round(dollars * 100);
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
}) => {
  const id = useId();
  const [displayValue, setDisplayValue] = useState(formatCurrency(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    const cents = parseCurrency(raw);
    const minCents = min !== undefined ? min : 0;
    const maxCents = max !== undefined ? max : Infinity;
    const clamped = Math.max(minCents, Math.min(maxCents, cents));
    onChange(clamped);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setDisplayValue(formatCurrency(value));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Show raw number on focus for easier editing
    const dollars = Math.round(value) / 100;
    setDisplayValue(dollars === 0 ? '' : String(dollars));
    e.target.select();
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-content">
        {label}
      </label>
      <div className="relative">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary text-sm select-none"
          aria-hidden="true"
        >
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          min={min !== undefined ? min / 100 : undefined}
          max={max !== undefined ? max / 100 : undefined}
          step={step !== undefined ? step / 100 : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="w-full pl-7 pr-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
        />
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-content-secondary">
          {hint}
        </p>
      )}
    </div>
  );
};

export default CurrencyInput;
