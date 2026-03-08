import React from 'react';
import CalculatorLayout from './CalculatorLayout';
import CurrencyInput from './shared/CurrencyInput';
import ResultCard from './shared/ResultCard';
import ShareButton from './shared/ShareButton';
import SaveScenarioButton from './shared/SaveScenarioButton';
import { useCalculator } from '../../hooks/useCalculator';
import SeoHead from '../shared/SeoHead';

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const NO_TAX_STATES = new Set([
  'AK', 'ID', 'IN', 'KS', 'LA', 'MS', 'MO', 'MT', 'NM', 'ND', 'TX', 'UT', 'WY',
]);

type BuyerType = 'standard' | 'firstTimeBuyer';
type PropertyType = 'primaryResidence' | 'investment' | 'secondHome';
type WhoPays = 'buyer' | 'seller' | 'split';

interface UsTransferTaxInputs extends Record<string, unknown> {
  propertyPrice: number;
  state: string;
  loanAmount: number;
  buyerType: BuyerType;
  propertyType: PropertyType;
  whoPays: WhoPays;
}

interface UsTransferTaxOutputs {
  stateTransferTax: number;
  mortgageRecordingTax: number;
  estimatedTitleInsurance: { min: number; max: number };
  estimatedTotalClosingCosts: { min: number; max: number };
  effectiveRate: number;
  hasTransferTax: boolean;
  whoPays: WhoPays;
  stateName: string;
  disclaimer: string;
  firstTimeBuyerExemption: number;
}

const DEFAULT_INPUTS: UsTransferTaxInputs = {
  propertyPrice: 50000000,
  state: 'CA',
  loanAmount: 40000000,
  buyerType: 'standard',
  propertyType: 'primaryResidence',
  whoPays: 'buyer',
};

function formatUSD(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatRate(rate: number): string {
  return `${rate.toFixed(3)}%`;
}

const SITE_URL = 'https://propertyhack.com.au';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'US Transfer Tax & Closing Costs Calculator',
    description:
      'Calculate transfer taxes and estimated closing costs for US property purchases. Covers all 50 states plus DC, including mortgage recording tax states and no-tax states.',
    url: `${SITE_URL}/tools/us/transfer-tax-calculator`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'US Transfer Tax Calculator',
        item: `${SITE_URL}/tools/us/transfer-tax-calculator`,
      },
    ],
  },
];

const UsTransferTaxCalculator: React.FC = () => {
  const { inputs, outputs, isCalculating, error, setInput, reset } =
    useCalculator<UsTransferTaxInputs, UsTransferTaxOutputs>(
      'us-transfer-tax',
      DEFAULT_INPUTS
    );

  const isNoTaxState = NO_TAX_STATES.has(inputs.state);
  const stateName =
    outputs?.stateName ??
    (US_STATES.find((s) => s.value === inputs.state)?.label ?? inputs.state);

  const headlineValue = outputs
    ? formatUSD(outputs.stateTransferTax)
    : '—';

  const WHO_PAYS_OPTIONS: { value: WhoPays; label: string }[] = [
    { value: 'buyer', label: 'Buyer pays' },
    { value: 'seller', label: 'Seller pays' },
    { value: 'split', label: 'Split equally' },
  ];

  const inputPanel = (
    <>
      <h2 className="text-base font-semibold text-brand-primary">Property Details</h2>

      <CurrencyInput
        label="Property Price (USD)"
        value={inputs.propertyPrice}
        onChange={(v) => setInput('propertyPrice', v)}
        min={1000_00}
        max={100_000_000_00}
        hint="Enter the purchase price of the property"
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="state-select" className="text-sm font-medium text-content">
          State
        </label>
        <select
          id="state-select"
          value={inputs.state}
          onChange={(e) => setInput('state', e.target.value as string)}
          className="w-full px-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
        >
          {US_STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <CurrencyInput
        label="Loan Amount (USD)"
        value={inputs.loanAmount}
        onChange={(v) => setInput('loanAmount', v)}
        min={0}
        max={inputs.propertyPrice}
        hint="Used to calculate mortgage recording tax (NY, FL, MD, etc.)"
      />

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-content">Who Pays Transfer Tax</span>
        <div className="flex flex-col gap-2">
          {WHO_PAYS_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="whoPays"
                value={option.value}
                checked={inputs.whoPays === option.value}
                onChange={() => setInput('whoPays', option.value)}
                className="w-4 h-4 accent-brand-gold"
              />
              <span className="text-sm text-content">{option.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-content-secondary">Default is based on state convention — you can override</p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-content">Buyer Type</span>
        <div className="flex gap-3">
          {(
            [
              { value: 'standard', label: 'Standard' },
              { value: 'firstTimeBuyer', label: 'First-time buyer' },
            ] as { value: BuyerType; label: string }[]
          ).map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="buyerType"
                value={option.value}
                checked={inputs.buyerType === option.value}
                onChange={() => setInput('buyerType', option.value)}
                className="w-4 h-4 accent-brand-gold"
              />
              <span className="text-sm text-content">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-content">Property Type</span>
        <div className="flex flex-col gap-2">
          {(
            [
              { value: 'primaryResidence', label: 'Primary residence' },
              { value: 'investment', label: 'Investment property' },
              { value: 'secondHome', label: 'Second home' },
            ] as { value: PropertyType; label: string }[]
          ).map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="propertyType"
                value={option.value}
                checked={inputs.propertyType === option.value}
                onChange={() => setInput('propertyType', option.value)}
                className="w-4 h-4 accent-brand-gold"
              />
              <span className="text-sm text-content">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

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
      {/* No-tax state banner */}
      {isNoTaxState && !outputs && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-green-600 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-green-800">
              No State Transfer Tax — {stateName}
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              {stateName} does not charge a state transfer tax. Closing cost estimates are shown below.
            </p>
          </div>
        </div>
      )}

      {/* Headline — state transfer tax */}
      <ResultCard
        label="State Transfer Tax"
        value={isCalculating ? 'Calculating…' : headlineValue}
        subtitle={
          outputs
            ? outputs.hasTransferTax
              ? `Effective rate: ${formatRate(outputs.effectiveRate)}`
              : 'No state transfer tax in this state'
            : undefined
        }
      />

      {/* Error state */}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* No-tax state result banner */}
      {outputs && !outputs.hasTransferTax && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-green-600 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-green-800">
              No State Transfer Tax — {outputs.stateName}
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              {outputs.stateName} is one of the states that does not charge a real estate transfer tax. Closing cost estimates still apply.
            </p>
          </div>
        </div>
      )}

      {/* First-time buyer exemption note */}
      {outputs?.firstTimeBuyerExemption > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800 mb-1">First-Time Buyer Exemption Applied</p>
          <p className="text-sm text-amber-700">
            A first-time buyer exemption or reduction has been applied based on {outputs.stateName} state rules.
          </p>
        </div>
      )}

      {/* Breakdown */}
      {outputs && (
        <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-brand-primary">Cost Breakdown</h3>
          <dl className="flex flex-col gap-2 text-sm">
            {outputs.hasTransferTax && (
              <div className="flex justify-between">
                <dt className="text-content-secondary">State transfer tax</dt>
                <dd className="font-medium text-content">{formatUSD(outputs.stateTransferTax)}</dd>
              </div>
            )}

            {outputs.mortgageRecordingTax > 0 && (
              <div className="flex justify-between">
                <dt className="text-content-secondary">Mortgage recording tax</dt>
                <dd className="font-medium text-content">{formatUSD(outputs.mortgageRecordingTax)}</dd>
              </div>
            )}

            <div className="flex justify-between">
              <dt className="text-content-secondary">Title insurance (est.)</dt>
              <dd className="font-medium text-content">
                {formatUSD(outputs.estimatedTitleInsurance.min)}–{formatUSD(outputs.estimatedTitleInsurance.max)}
              </dd>
            </div>

            <div className="flex justify-between border-t border-base-300 pt-2">
              <dt className="font-semibold text-content">Est. total closing costs</dt>
              <dd className="font-bold text-brand-primary text-base">
                {formatUSD(outputs.estimatedTotalClosingCosts.min)}–{formatUSD(outputs.estimatedTotalClosingCosts.max)}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Who pays note */}
      {outputs && (
        <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex items-start gap-3">
          <svg
            className="w-4 h-4 text-content-secondary mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
          <p className="text-sm text-content-secondary">
            {outputs.whoPays === 'buyer' && 'In most cases in this state, the buyer pays the transfer tax.'}
            {outputs.whoPays === 'seller' && 'In most cases in this state, the seller pays the transfer tax.'}
            {outputs.whoPays === 'split' && 'In this state, the transfer tax is typically split between buyer and seller.'}
          </p>
        </div>
      )}

      {/* Effective rate */}
      {outputs && outputs.hasTransferTax && (
        <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-content-secondary">Effective Transfer Tax Rate</p>
            <p className="text-2xl font-bold text-brand-primary">{formatRate(outputs.effectiveRate)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-content-secondary">of property price</p>
            <p className="text-sm font-medium text-content">{formatUSD(inputs.propertyPrice)}</p>
          </div>
        </div>
      )}

      {/* Save */}
      <SaveScenarioButton
        calculatorType="us-transfer-tax"
        inputs={inputs as Record<string, unknown>}
        outputs={outputs as unknown as Record<string, unknown> | null}
        headlineLabel="State Transfer Tax"
        headlineValue={headlineValue}
      />

      {/* Disclaimer */}
      <p className="text-xs text-content-secondary leading-relaxed">
        {outputs?.disclaimer || 'Transfer taxes vary by county and municipality. This is an estimate — consult a local attorney or title company for exact costs.'}
      </p>
    </>
  );

  return (
    <>
      <SeoHead
        title="Transfer Tax Calculator USA 2026 — All 50 States"
        description="Calculate state transfer taxes, mortgage recording tax, and estimated closing costs for US property purchases across all 50 states and DC. Understand your full closing costs before you buy."
        canonicalUrl="/tools/us/transfer-tax-calculator"
        jsonLd={jsonLd}
      />
      <CalculatorLayout
        title="US Transfer Tax & Closing Costs Calculator"
        subtitle="Estimate transfer taxes, mortgage recording tax, and closing costs for property purchases across all US states."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Tools', href: '/tools' },
          { label: 'US Transfer Tax Calculator' },
        ]}
        inputs={inputPanel}
        results={resultsPanel}
      />
    </>
  );
};

export default UsTransferTaxCalculator;
