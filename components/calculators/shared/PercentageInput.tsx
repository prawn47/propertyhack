import React, { useId } from 'react';

interface PercentageInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}

const PercentageInput: React.FC<PercentageInputProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.01,
  hint,
}) => {
  const id = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    if (isNaN(raw)) return;
    const clamped = Math.max(min, Math.min(max, raw));
    onChange(clamped);
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-content">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          inputMode="decimal"
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="w-full pl-3 pr-8 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
        />
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-content-secondary text-sm select-none"
          aria-hidden="true"
        >
          %
        </span>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-content-secondary">
          {hint}
        </p>
      )}
    </div>
  );
};

export default PercentageInput;
