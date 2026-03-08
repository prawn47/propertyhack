import React from 'react';
import { Link } from 'react-router-dom';

interface HenryCalculatorResultProps {
  type: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  compact?: boolean;
}

const CALCULATOR_CONFIG: Record<string, { label: string; route: string }> = {
  mortgage: { label: 'Mortgage Estimate', route: '/tools/mortgage-calculator' },
  borrowing_power: { label: 'Borrowing Power', route: '/tools/borrowing-power-calculator' },
  stamp_duty: { label: 'Stamp Duty', route: '/tools/stamp-duty-calculator' },
  rental_yield: { label: 'Rental Yield', route: '/tools/rental-yield-calculator' },
  rent_vs_buy: { label: 'Rent vs Buy', route: '/tools/rent-vs-buy-calculator' },
  buying_costs: { label: 'Buying Costs', route: '/tools/buying-costs-calculator' },
};

function formatValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  const num = typeof value === 'string' ? Number(value) : value;
  if (typeof num === 'number' && !isNaN(num)) {
    const key = String(value);
    // Percentages: small values that look like rates (0–100 range with decimals)
    if (key.includes('%')) return key;
    return num.toLocaleString('en-AU', { maximumFractionDigits: 2 });
  }

  return String(value);
}

function formatOutputEntry(key: string, value: any): string {
  if (value === null || value === undefined) return '—';

  const lowerKey = key.toLowerCase();
  const isCurrency =
    lowerKey.includes('price') ||
    lowerKey.includes('payment') ||
    lowerKey.includes('repayment') ||
    lowerKey.includes('amount') ||
    lowerKey.includes('cost') ||
    lowerKey.includes('total') ||
    lowerKey.includes('stamp') ||
    lowerKey.includes('duty') ||
    lowerKey.includes('yield') ||
    lowerKey.includes('income') ||
    lowerKey.includes('savings') ||
    lowerKey.includes('equity') ||
    lowerKey.includes('profit') ||
    lowerKey.includes('interest') ||
    lowerKey.includes('power') ||
    lowerKey.includes('budget') ||
    lowerKey.includes('loan') ||
    lowerKey.includes('deposit');

  const isPercentage =
    lowerKey.includes('rate') ||
    lowerKey.includes('percent') ||
    lowerKey.includes('lvr') ||
    lowerKey.includes('ratio') ||
    lowerKey.endsWith('pct') ||
    lowerKey.endsWith('%');

  const num = typeof value === 'string' ? Number(value) : value;
  if (typeof num === 'number' && !isNaN(num)) {
    if (isCurrency) {
      return '$' + Math.round(num).toLocaleString('en-AU');
    }
    if (isPercentage) {
      return num.toFixed(2) + '%';
    }
    return num.toLocaleString('en-AU', { maximumFractionDigits: 2 });
  }

  return String(value);
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function buildQueryString(inputs: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(inputs).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

const CalculatorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="10" y2="10" />
    <line x1="14" y1="10" x2="16" y2="10" />
    <line x1="8" y1="14" x2="10" y2="14" />
    <line x1="14" y1="14" x2="16" y2="14" />
    <line x1="8" y1="18" x2="10" y2="18" />
    <line x1="14" y1="18" x2="16" y2="18" />
  </svg>
);

const HenryCalculatorResult: React.FC<HenryCalculatorResultProps> = ({
  type,
  inputs,
  outputs,
  compact = false,
}) => {
  const config = CALCULATOR_CONFIG[type] ?? {
    label: formatLabel(type),
    route: '/tools/mortgage-calculator',
  };

  const market = (inputs.market as string | undefined)?.toLowerCase() ?? 'au';
  const countryPrefix = `/${market}`;
  const fullRoute = `${countryPrefix}${config.route}`;
  const queryString = buildQueryString(inputs);
  const linkTo = queryString ? `${fullRoute}?${queryString}` : fullRoute;

  const outputEntries = Object.entries(outputs).filter(
    ([, v]) => v !== null && v !== undefined
  );

  const displayEntries = compact ? outputEntries.slice(0, 3) : outputEntries;

  return (
    <div className="border border-gray-200 bg-gray-50 rounded-lg p-3 my-2 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <CalculatorIcon className="w-4 h-4 text-brand-gold shrink-0" />
        <span className="font-semibold text-brand-primary">{config.label}</span>
      </div>

      <dl className={compact ? 'space-y-1' : 'grid grid-cols-2 gap-x-4 gap-y-1'}>
        {displayEntries.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-2 col-span-1">
            <dt className="text-gray-500 truncate">{formatLabel(key)}</dt>
            <dd className="font-medium text-brand-primary whitespace-nowrap">
              {formatOutputEntry(key, value)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-2 pt-2 border-t border-gray-200">
        <Link
          to={linkTo}
          className="text-brand-gold hover:underline text-xs font-medium inline-flex items-center gap-1"
        >
          Open full calculator
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3 h-3"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default HenryCalculatorResult;
