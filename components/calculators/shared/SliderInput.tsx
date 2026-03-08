import React, { useId } from 'react';

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  hint?: string;
}

const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  hint,
}) => {
  const id = useId();
  const sliderId = `${id}-slider`;
  const inputId = `${id}-input`;

  const fillPercent = ((value - min) / (max - min)) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    if (isNaN(raw)) return;
    const clamped = Math.max(min, Math.min(max, raw));
    onChange(clamped);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={sliderId} className="text-sm font-medium text-content">
          {label}
        </label>
        <div className="flex items-center gap-1">
          <input
            id={inputId}
            type="number"
            value={value}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            aria-label={`${label} value`}
            className="w-16 px-2 py-1 text-sm text-right bg-base-200 border border-base-300 rounded-lg text-content focus:outline-none focus:border-brand-gold transition-colors"
          />
          {unit && (
            <span className="text-sm text-content-secondary select-none">{unit}</span>
          )}
        </div>
      </div>

      <div className="relative h-5 flex items-center">
        {/* Track background */}
        <div className="absolute w-full h-1.5 rounded-full bg-base-300 pointer-events-none" />
        {/* Filled track */}
        <div
          className="absolute h-1.5 rounded-full bg-brand-gold pointer-events-none"
          style={{ width: `${fillPercent}%` }}
          aria-hidden="true"
        />
        <input
          id={sliderId}
          type="range"
          value={value}
          onChange={handleSliderChange}
          min={min}
          max={max}
          step={step}
          aria-label={label}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          className="relative w-full appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-brand-gold
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-base-100
            [&::-webkit-slider-thumb]:shadow-soft
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-brand-gold
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-base-100
            [&::-moz-range-thumb]:shadow-soft
            focus:outline-none
            focus-visible:[&::-webkit-slider-thumb]:ring-2
            focus-visible:[&::-webkit-slider-thumb]:ring-brand-gold
            focus-visible:[&::-webkit-slider-thumb]:ring-offset-1"
        />
      </div>

      <div className="flex justify-between text-xs text-content-secondary">
        <span>{min}{unit ? ` ${unit}` : ''}</span>
        <span>{max}{unit ? ` ${unit}` : ''}</span>
      </div>

      {hint && (
        <p className="text-xs text-content-secondary">{hint}</p>
      )}
    </div>
  );
};

export default SliderInput;
