import React from 'react';
import CalculatorLayout from './CalculatorLayout';
import CurrencyInput from './shared/CurrencyInput';
import ResultCard from './shared/ResultCard';
import ShareButton from './shared/ShareButton';
import SaveScenarioButton from './shared/SaveScenarioButton';
import { useCalculator } from '../../hooks/useCalculator';
import SeoHead from '../shared/SeoHead';

const STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
];

type BuyerType = 'standard' | 'firstHomeBuyer' | 'foreign';
type PropertyType = 'established' | 'new' | 'vacant_land';

interface StampDutyInputs extends Record<string, unknown> {
  propertyPrice: number;
  state: string;
  buyerType: BuyerType;
  propertyType: PropertyType;
  primaryResidence: boolean;
  vicOffThePlan: boolean;
}

interface StampDutyOutputs {
  stampDuty: number;
  concessionApplied: string | null;
  totalUpfrontCost: number;
  effectiveRate: number;
  legalFees: number;
  inspectionCosts: number;
  notes: string[];
}

const DEFAULT_INPUTS: StampDutyInputs = {
  propertyPrice: 75000000,
  state: 'NSW',
  buyerType: 'standard',
  propertyType: 'established',
  primaryResidence: true,
  vicOffThePlan: false,
};

function formatDollars(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatRate(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

const SITE_URL = 'https://propertyhack.com.au';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Stamp Duty Calculator',
    description: 'Calculate stamp duty for property purchases across all Australian states and territories. Includes first home buyer concessions and foreign buyer surcharges.',
    url: `${SITE_URL}/tools/stamp-duty-calculator`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'AUD',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` },
      { '@type': 'ListItem', position: 3, name: 'Stamp Duty Calculator', item: `${SITE_URL}/tools/stamp-duty-calculator` },
    ],
  },
];

const StampDutyCalculator: React.FC = () => {
  const { inputs, outputs, isCalculating, error, setInput, reset } =
    useCalculator<StampDutyInputs, StampDutyOutputs>('stamp-duty', DEFAULT_INPUTS);

  const isVic = inputs.state === 'VIC';

  const headlineValue = outputs ? formatDollars(outputs.stampDuty) : '—';

  const inputPanel = (
    <>
      <h2 className="text-base font-semibold text-brand-primary">Property Details</h2>

      <CurrencyInput
        label="Property Price"
        value={inputs.propertyPrice}
        onChange={(v) => setInput('propertyPrice', v)}
        min={1000_00}
        max={100_000_000_00}
        hint="Enter the purchase price of the property"
      />

      {/* State/Territory */}
      <div className="flex flex-col gap-1">
        <label htmlFor="state-select" className="text-sm font-medium text-content">
          State / Territory
        </label>
        <select
          id="state-select"
          value={inputs.state}
          onChange={(e) => {
            setInput('state', e.target.value);
            if (e.target.value !== 'VIC') {
              setInput('vicOffThePlan', false);
            }
          }}
          className="w-full px-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
        >
          {STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Buyer Type */}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-content">Buyer Type</span>
        <div className="flex flex-col gap-2">
          {(
            [
              { value: 'standard', label: 'Standard Buyer' },
              { value: 'firstHomeBuyer', label: 'First Home Buyer' },
              { value: 'foreign', label: 'Foreign Buyer' },
            ] as { value: BuyerType; label: string }[]
          ).map((option) => (
            <label key={option.value} className="flex items-center gap-3 cursor-pointer">
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

      {/* Property Type */}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-content">Property Type</span>
        <div className="flex gap-3">
          {(
            [
              { value: 'established', label: 'Established' },
              { value: 'new', label: 'New Build' },
              { value: 'vacant_land', label: 'Vacant Land' },
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

      {/* Primary Residence Toggle */}
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <div>
          <span className="text-sm font-medium text-content block">Primary Residence</span>
          <span className="text-xs text-content-secondary">Will this be your main home?</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={inputs.primaryResidence}
          onClick={() => setInput('primaryResidence', !inputs.primaryResidence)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 ${
            inputs.primaryResidence ? 'bg-brand-gold' : 'bg-base-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              inputs.primaryResidence ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </label>

      {/* VIC Off-the-Plan (conditional) */}
      {isVic && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={inputs.vicOffThePlan}
            onChange={(e) => setInput('vicOffThePlan', e.target.checked)}
            className="w-4 h-4 accent-brand-gold rounded"
          />
          <div>
            <span className="text-sm font-medium text-content block">VIC Off-the-Plan</span>
            <span className="text-xs text-content-secondary">Purchasing an off-the-plan property in Victoria</span>
          </div>
        </label>
      )}

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
        label="Total Stamp Duty"
        value={isCalculating ? 'Calculating…' : headlineValue}
        subtitle={
          outputs
            ? `Effective rate: ${formatRate(outputs.effectiveRate)}`
            : undefined
        }
      />

      {/* Error state */}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Concession note */}
      {outputs?.concessionApplied && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800 mb-1">Concession Applied</p>
          <p className="text-sm text-amber-700">{outputs.concessionApplied}</p>
        </div>
      )}

      {/* Notes from calculator */}
      {outputs?.notes && outputs.notes.length > 0 && (
        <div className="bg-amber-50 border border-brand-gold/30 rounded-xl p-4">
          {outputs.notes.map((note, i) => (
            <p key={i} className="text-sm text-amber-800">{note}</p>
          ))}
        </div>
      )}

      {/* Breakdown */}
      {outputs && (
        <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-brand-primary">Total Upfront Cost Breakdown</h3>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-content-secondary">Stamp duty</dt>
              <dd className="font-medium text-content">{formatDollars(outputs.stampDuty)}</dd>
            </div>
            <div className="flex justify-between pt-1">
              <dt className="text-content-secondary">Legal fees (est.)</dt>
              <dd className="font-medium text-content">{formatDollars(outputs.legalFees)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-content-secondary">Building & pest inspection (est.)</dt>
              <dd className="font-medium text-content">{formatDollars(outputs.inspectionCosts)}</dd>
            </div>
            <div className="flex justify-between border-t border-base-300 pt-2">
              <dt className="font-semibold text-content">Total upfront costs</dt>
              <dd className="font-bold text-brand-primary text-base">{formatDollars(outputs.totalUpfrontCost)}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Effective rate callout */}
      {outputs && (
        <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-content-secondary">Effective Duty Rate</p>
            <p className="text-2xl font-bold text-brand-primary">{formatRate(outputs.effectiveRate)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-content-secondary">of property price</p>
            <p className="text-sm font-medium text-content">{formatDollars(inputs.propertyPrice)}</p>
          </div>
        </div>
      )}

      {/* Save */}
      <SaveScenarioButton
        calculatorType="stamp-duty"
        inputs={inputs as Record<string, unknown>}
        outputs={outputs as unknown as Record<string, unknown> | null}
        headlineLabel="Total Stamp Duty"
        headlineValue={headlineValue}
      />

      {/* Disclaimer */}
      <p className="text-xs text-content-secondary leading-relaxed">
        Estimates are based on current bracket data and may differ from official calculations. Consult a conveyancer or solicitor for a binding figure. Rates are updated periodically but may not reflect recent legislative changes.
      </p>
    </>
  );

  return (
    <>
      <SeoHead
        title="Stamp Duty Calculator"
        description="Calculate stamp duty for property purchases across all Australian states and territories. Includes first home buyer concessions, foreign buyer surcharges, and VIC off-the-plan concessions."
        canonicalUrl="/tools/stamp-duty-calculator"
        jsonLd={jsonLd}
      />
      <CalculatorLayout
        title="Stamp Duty Calculator"
        subtitle="Calculate the stamp duty payable on a property purchase across all Australian states and territories."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Tools', href: '/tools' },
          { label: 'Stamp Duty Calculator' },
        ]}
        inputs={inputPanel}
        results={resultsPanel}
      />
    </>
  );
};

export default StampDutyCalculator;
