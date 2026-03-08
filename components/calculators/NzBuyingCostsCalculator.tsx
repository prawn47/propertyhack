import React, { useEffect, useRef, useState, useCallback } from 'react';
import CalculatorLayout from './CalculatorLayout';
import CurrencyInput from './shared/CurrencyInput';
import SliderInput from './shared/SliderInput';
import ResultCard from './shared/ResultCard';
import ShareButton from './shared/ShareButton';
import SaveScenarioButton from './shared/SaveScenarioButton';
import SeoHead from '../shared/SeoHead';
import { calculate } from '../../services/calculatorService';

type BuyerType = 'owner-occupier' | 'investor';

interface NzBuyingCostsInputs {
  propertyPriceCents: number;
  buyerType: BuyerType;
  firstHomeBuyer: boolean;
  depositPercentage: number;
  newBuild: boolean;
}

interface LineItem {
  label: string;
  min: number;
  max: number;
  note: string;
}

interface NzBuyingCostsOutputs {
  noTransferTax: boolean;
  noTransferTaxNote: string;
  propertyPrice: number;
  depositPercentage: number;
  loanAmount: number;
  isLowEquity: boolean;
  lineItems: LineItem[];
  totalMin: number;
  totalMax: number;
  notes: string[];
}

const DEFAULT_INPUTS: NzBuyingCostsInputs = {
  propertyPriceCents: 75000000,
  buyerType: 'owner-occupier',
  firstHomeBuyer: false,
  depositPercentage: 20,
  newBuild: false,
};

function formatNZD(dollars: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

function formatRange(min: number, max: number): string {
  if (min === max) return formatNZD(min);
  return `${formatNZD(min)} – ${formatNZD(max)}`;
}

function parseQueryParams(): NzBuyingCostsInputs {
  const params = new URLSearchParams(window.location.search);
  const result = { ...DEFAULT_INPUTS };
  const priceStr = params.get('propertyPriceCents');
  const buyerType = params.get('buyerType');
  const firstHome = params.get('firstHomeBuyer');
  const deposit = params.get('depositPercentage');
  const newBuild = params.get('newBuild');
  if (priceStr && !isNaN(Number(priceStr))) result.propertyPriceCents = Number(priceStr);
  if (buyerType === 'owner-occupier' || buyerType === 'investor') result.buyerType = buyerType;
  if (firstHome !== null) result.firstHomeBuyer = firstHome === 'true';
  if (deposit && !isNaN(Number(deposit))) result.depositPercentage = Number(deposit);
  if (newBuild !== null) result.newBuild = newBuild === 'true';
  return result;
}

function updateQueryParams(inputs: NzBuyingCostsInputs) {
  const params = new URLSearchParams();
  Object.entries(inputs).forEach(([k, v]) => {
    if (v !== null && v !== undefined) params.set(k, String(v));
  });
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
}

const SITE_URL = 'https://propertyhack.com.au';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'NZ Buying Costs Calculator',
    description: 'Estimate buying costs for a New Zealand property purchase. NZ has no stamp duty or transfer tax.',
    url: `${SITE_URL}/tools/nz/buying-costs-calculator`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'NZD' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` },
      { '@type': 'ListItem', position: 3, name: 'NZ Buying Costs Calculator', item: `${SITE_URL}/tools/nz/buying-costs-calculator` },
    ],
  },
];

const NzBuyingCostsCalculator: React.FC = () => {
  const [inputs, setInputsState] = useState<NzBuyingCostsInputs>(() => parseQueryParams());
  const [outputs, setOutputs] = useState<NzBuyingCostsOutputs | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setInput = useCallback(<K extends keyof NzBuyingCostsInputs>(key: K, value: NzBuyingCostsInputs[K]) => {
    setInputsState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setInputsState(DEFAULT_INPUTS);
    setOutputs(null);
    setError(null);
  }, []);

  // Sync URL params
  useEffect(() => {
    updateQueryParams(inputs);
  }, [inputs]);

  // Debounced calculate — convert cents to NZD dollars before sending
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsCalculating(true);
      setError(null);
      try {
        const payload = {
          propertyPrice: inputs.propertyPriceCents / 100,
          buyerType: inputs.buyerType,
          firstHomeBuyer: inputs.firstHomeBuyer,
          depositPercentage: inputs.depositPercentage,
          newBuild: inputs.newBuild,
        };
        const result = await calculate('nz-buying-costs', payload as Record<string, unknown>);
        setOutputs(result as unknown as NzBuyingCostsOutputs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Calculation failed');
      } finally {
        setIsCalculating(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputs]);

  const headlineValue = outputs
    ? `${formatNZD(outputs.totalMin)} – ${formatNZD(outputs.totalMax)}`
    : '—';

  // Inputs for save scenario (translate back to serialisable form)
  const scenarioInputs: Record<string, unknown> = {
    propertyPrice: inputs.propertyPriceCents / 100,
    buyerType: inputs.buyerType,
    firstHomeBuyer: inputs.firstHomeBuyer,
    depositPercentage: inputs.depositPercentage,
    newBuild: inputs.newBuild,
  };

  const inputPanel = (
    <>
      <h2 className="text-base font-semibold text-brand-primary">Property Details</h2>

      {/* No stamp duty banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <svg
          className="w-5 h-5 text-amber-600 mt-0.5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-amber-800">New Zealand has no stamp duty or transfer tax</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Unlike Australia, the UK, and most other countries, NZ buyers pay no government transfer tax on property purchases.
          </p>
        </div>
      </div>

      <CurrencyInput
        label="Property Price (NZD)"
        value={inputs.propertyPriceCents}
        onChange={(v) => setInput('propertyPriceCents', v)}
        min={100_00}
        max={100_000_000_00}
        hint="Enter the purchase price in New Zealand dollars"
      />

      {/* Buyer Type */}
      <div className="flex flex-col gap-1">
        <label htmlFor="buyer-type-select" className="text-sm font-medium text-content">
          Buyer Type
        </label>
        <select
          id="buyer-type-select"
          value={inputs.buyerType}
          onChange={(e) => setInput('buyerType', e.target.value as BuyerType)}
          className="w-full px-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
        >
          <option value="owner-occupier">Owner-occupier</option>
          <option value="investor">Investor</option>
        </select>
      </div>

      {/* First Home Buyer toggle */}
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <div>
          <span className="text-sm font-medium text-content block">First Home Buyer</span>
          <span className="text-xs text-content-secondary">Eligible for First Home Loan (Kāinga Ora)</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={inputs.firstHomeBuyer}
          onClick={() => setInput('firstHomeBuyer', !inputs.firstHomeBuyer)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 ${
            inputs.firstHomeBuyer ? 'bg-brand-gold' : 'bg-base-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              inputs.firstHomeBuyer ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </label>

      {/* Deposit Percentage slider */}
      <SliderInput
        label="Deposit"
        value={inputs.depositPercentage}
        onChange={(v) => setInput('depositPercentage', v)}
        min={5}
        max={50}
        step={1}
        unit="%"
        hint={inputs.depositPercentage < 20 ? 'Below 20% — a low equity premium may apply' : undefined}
      />

      {/* New Build toggle */}
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <div>
          <span className="text-sm font-medium text-content block">New Build</span>
          <span className="text-xs text-content-secondary">Purchasing a newly constructed property</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={inputs.newBuild}
          onClick={() => setInput('newBuild', !inputs.newBuild)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 ${
            inputs.newBuild ? 'bg-brand-gold' : 'bg-base-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              inputs.newBuild ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </label>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-base-300">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2.5 text-sm font-medium text-content border border-base-300 rounded-lg hover:border-brand-gold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-1"
        >
          Reset
        </button>
        <ShareButton />
      </div>
    </>
  );

  const resultsPanel = (
    <>
      {/* Headline */}
      <ResultCard
        label="Estimated Buying Costs"
        value={isCalculating ? 'Calculating…' : headlineValue}
        subtitle={outputs ? `Loan amount: ${formatNZD(outputs.loanAmount)}` : undefined}
      />

      {/* Error state */}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Itemised breakdown */}
      {outputs && (
        <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-brand-primary">Cost Breakdown</h3>
          <dl className="flex flex-col gap-3 text-sm">
            {outputs.lineItems.map((item, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <div className="flex justify-between items-start">
                  <dt className="text-content-secondary">{item.label}</dt>
                  <dd className="font-medium text-content text-right ml-4">
                    {formatRange(item.min, item.max)}
                  </dd>
                </div>
                {item.note && (
                  <p className="text-xs text-content-secondary leading-snug">{item.note}</p>
                )}
              </div>
            ))}
            <div className="flex justify-between items-center border-t border-base-300 pt-2 mt-1">
              <dt className="font-semibold text-content">Total estimated costs</dt>
              <dd className="font-bold text-brand-primary text-base">
                {formatRange(outputs.totalMin, outputs.totalMax)}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Low equity callout */}
      {outputs?.isLowEquity && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800 mb-1">Low Equity Premium Applies</p>
          <p className="text-sm text-amber-700">
            Your deposit is below 20% (LVR &gt;80%). Most NZ lenders charge a low equity premium — this is included in the breakdown above.
          </p>
        </div>
      )}

      {/* Regulatory notes */}
      {outputs && outputs.notes.length > 0 && (
        <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-brand-primary">Regulatory Notes</h3>
          <ul className="flex flex-col gap-2">
            {outputs.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-content">
                <svg
                  className="w-4 h-4 text-brand-gold mt-0.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Save */}
      <SaveScenarioButton
        calculatorType="nz-buying-costs"
        inputs={scenarioInputs}
        outputs={outputs as unknown as Record<string, unknown> | null}
        headlineLabel="Estimated Buying Costs"
        headlineValue={headlineValue}
      />

      {/* Disclaimer */}
      <p className="text-xs text-content-secondary leading-relaxed">
        Cost estimates are indicative ranges based on typical NZ market rates. Actual costs vary by location, property type, lender, and legal complexity. Consult a solicitor or conveyancer for a binding cost estimate.
      </p>
    </>
  );

  return (
    <>
      <SeoHead
        title="NZ Buying Costs Calculator"
        description="Estimate your total buying costs for a New Zealand property purchase. New Zealand has no stamp duty or transfer tax — calculate legal fees, inspections, LIM reports, and more."
        canonicalUrl="/tools/nz/buying-costs-calculator"
        jsonLd={jsonLd}
      />
      <CalculatorLayout
        title="NZ Buying Costs Calculator"
        subtitle="Estimate the total costs of buying a property in New Zealand. Unlike most countries, NZ has no stamp duty or transfer tax."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Tools', href: '/tools' },
          { label: 'NZ Buying Costs Calculator' },
        ]}
        inputs={inputPanel}
        results={resultsPanel}
      />
    </>
  );
};

export default NzBuyingCostsCalculator;
