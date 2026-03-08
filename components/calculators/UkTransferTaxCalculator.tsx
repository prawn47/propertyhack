import React from 'react';
import CalculatorLayout from './CalculatorLayout';
import CurrencyInput from './shared/CurrencyInput';
import ResultCard from './shared/ResultCard';
import ShareButton from './shared/ShareButton';
import SaveScenarioButton from './shared/SaveScenarioButton';
import { useCalculator } from '../../hooks/useCalculator';

type UkLocation = 'england_and_northern_ireland' | 'scotland' | 'wales';
type BuyerType = 'standard' | 'first_time' | 'additional';

interface UkTransferTaxInputs extends Record<string, unknown> {
  propertyPrice: number;
  location: UkLocation;
  buyerType: BuyerType;
  ukResident: boolean;
}

interface TaxBand {
  from: number;
  to: number;
  rate: number;
  amount: number;
}

interface Surcharge {
  label: string;
  amount?: number;
  note?: string;
}

interface ComparisonEntry {
  taxName: string;
  abbreviation: string;
  taxAmount: number;
  effectiveRate: number;
}

interface UkTransferTaxOutputs {
  taxAmount: number;
  taxName: string;
  abbreviation: string;
  bands: TaxBand[];
  effectiveRate: number;
  surcharges: Surcharge[];
  note: string | null;
  comparison: Record<string, ComparisonEntry>;
}

const DEFAULT_INPUTS: UkTransferTaxInputs = {
  propertyPrice: 35000000,
  location: 'england_and_northern_ireland',
  buyerType: 'standard',
  ukResident: true,
};

const LOCATION_OPTIONS: { value: UkLocation; label: string }[] = [
  { value: 'england_and_northern_ireland', label: 'England & Northern Ireland' },
  { value: 'scotland', label: 'Scotland' },
  { value: 'wales', label: 'Wales' },
];

const REGION_LABELS: Record<string, string> = {
  england_and_northern_ireland: 'England & Northern Ireland',
  scotland: 'Scotland',
  wales: 'Wales',
};

function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatRate(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

function formatBandRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

const SITE_URL = 'https://propertyhack.com.au';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'UK Stamp Duty Calculator — SDLT, LBTT & LTT',
    description:
      'Calculate UK property transfer tax across all three systems: Stamp Duty Land Tax (England & Northern Ireland), Land and Buildings Transaction Tax (Scotland), and Land Transaction Tax (Wales).',
    url: `${SITE_URL}/tools/uk/stamp-duty-calculator`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GBP',
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
        name: 'UK Stamp Duty Calculator',
        item: `${SITE_URL}/tools/uk/stamp-duty-calculator`,
      },
    ],
  },
];

const UkTransferTaxCalculator: React.FC = () => {
  const { inputs, outputs, isCalculating, error, setInput, reset } =
    useCalculator<UkTransferTaxInputs, UkTransferTaxOutputs>('uk-transfer-tax', DEFAULT_INPUTS);

  const isEngland = inputs.location === 'england_and_northern_ireland';
  const isWales = inputs.location === 'wales';

  const taxLabel = outputs?.abbreviation ?? 'Tax';
  const headlineValue = outputs ? formatGBP(outputs.taxAmount) : '—';

  const inputPanel = (
    <>
      <h2 className="text-base font-semibold text-brand-primary">Property Details</h2>

      {/* Property price in GBP */}
      <CurrencyInput
        label="Property Price (GBP)"
        value={inputs.propertyPrice}
        onChange={(v) => setInput('propertyPrice', v)}
        min={100_00}
        max={100_000_000_00}
        hint="Enter the purchase price in British pounds"
      />

      {/* Location selector — primary control */}
      <div className="flex flex-col gap-1">
        <label htmlFor="uk-location-select" className="text-sm font-medium text-content">
          Location
        </label>
        <select
          id="uk-location-select"
          value={inputs.location}
          onChange={(e) => {
            const loc = e.target.value as UkLocation;
            setInput('location', loc);
            if (loc === 'wales' && inputs.buyerType === 'first_time') {
              setInput('buyerType', 'standard');
            }
            if (loc !== 'england_and_northern_ireland') {
              setInput('ukResident', true);
            }
          }}
          className="w-full px-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
        >
          {LOCATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {outputs?.taxName && (
          <p className="text-xs text-content-secondary mt-0.5">
            Tax applies: <span className="font-medium text-content">{outputs.taxName}</span>
          </p>
        )}
      </div>

      {/* Buyer type */}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-content">Buyer Type</span>
        <div className="flex flex-col gap-2">
          {(
            [
              { value: 'standard', label: 'Standard buyer' },
              { value: 'first_time', label: 'First-time buyer', hideForWales: true },
              { value: 'additional', label: 'Additional property (second home / buy-to-let)' },
            ] as { value: BuyerType; label: string; hideForWales?: boolean }[]
          )
            .filter((opt) => !(opt.hideForWales && isWales))
            .map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="buyerType"
                  value={opt.value}
                  checked={inputs.buyerType === opt.value}
                  onChange={() => setInput('buyerType', opt.value)}
                  className="w-4 h-4 accent-brand-gold"
                />
                <span className="text-sm text-content">{opt.label}</span>
              </label>
            ))}
        </div>
        {isWales && (
          <p className="text-xs text-content-secondary mt-1">
            Wales has no first-time buyer relief. The £225,000 nil-rate band applies to all buyers.
          </p>
        )}
      </div>

      {/* UK resident toggle — England & NI only */}
      {isEngland && (
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <span className="text-sm font-medium text-content block">UK Resident</span>
            <span className="text-xs text-content-secondary">
              Non-UK residents pay an additional 2% surcharge (England & NI only)
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={inputs.ukResident}
            onClick={() => setInput('ukResident', !inputs.ukResident)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 ${
              inputs.ukResident ? 'bg-brand-gold' : 'bg-base-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                inputs.ukResident ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
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
        label={`Total ${taxLabel}`}
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

      {/* FTB relief lost / Wales FTB note */}
      {outputs?.note && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800 mb-1">Note</p>
          <p className="text-sm text-amber-700">{outputs.note}</p>
        </div>
      )}

      {/* Surcharges */}
      {outputs?.surcharges && outputs.surcharges.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-sm font-medium text-blue-900">Surcharges Applied</p>
          {outputs.surcharges.map((s, i) => (
            <div key={i}>
              <p className="text-sm font-medium text-blue-800">{s.label}</p>
              {s.amount !== undefined && (
                <p className="text-sm text-blue-700">{formatGBP(s.amount)}</p>
              )}
              {s.note && <p className="text-xs text-blue-600 mt-0.5">{s.note}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Band-by-band breakdown */}
      {outputs?.bands && outputs.bands.length > 0 && (
        <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-brand-primary">
            {taxLabel} — Band Breakdown
          </h3>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-content-secondary text-xs uppercase tracking-wide">
                  <th className="text-left pb-2 font-medium">Band</th>
                  <th className="text-right pb-2 font-medium">Rate</th>
                  <th className="text-right pb-2 font-medium">Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300">
                {outputs.bands.map((band, i) => (
                  <tr key={i}>
                    <td className="py-2 text-content-secondary">
                      {formatGBP(band.from)} – {formatGBP(band.to)}
                    </td>
                    <td className="py-2 text-right text-content">{formatBandRate(band.rate)}</td>
                    <td className="py-2 text-right font-medium text-content">{formatGBP(band.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-base-300">
                  <td className="pt-2 font-semibold text-content" colSpan={2}>
                    Total {taxLabel}
                  </td>
                  <td className="pt-2 text-right font-bold text-brand-primary">
                    {formatGBP(outputs.taxAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Effective rate callout */}
      {outputs && (
        <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-content-secondary">Effective Tax Rate</p>
            <p className="text-2xl font-bold text-brand-primary">{formatRate(outputs.effectiveRate)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-content-secondary">of property price</p>
            <p className="text-sm font-medium text-content">
              {formatGBP(inputs.propertyPrice / 100)}
            </p>
          </div>
        </div>
      )}

      {/* Cross-region comparison */}
      {outputs?.comparison && Object.keys(outputs.comparison).length > 0 && (
        <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-brand-primary">Regional Comparison</h3>
          <p className="text-xs text-content-secondary">
            Same property price in other UK regions (standard buyer rates):
          </p>
          <dl className="flex flex-col gap-2">
            {Object.entries(outputs.comparison).map(([region, comp]) => {
              const isCurrent = region === inputs.location;
              return (
                <div
                  key={region}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                    isCurrent
                      ? 'bg-brand-gold/10 border border-brand-gold/30'
                      : 'bg-base-200'
                  }`}
                >
                  <dt className={`font-medium ${isCurrent ? 'text-brand-primary' : 'text-content'}`}>
                    {REGION_LABELS[region] ?? region}
                    {isCurrent && (
                      <span className="ml-2 text-xs font-normal text-brand-gold">(current)</span>
                    )}
                  </dt>
                  <dd className={`font-semibold ${isCurrent ? 'text-brand-primary' : 'text-content'}`}>
                    {formatGBP(comp.taxAmount)}
                    <span className="ml-1 text-xs font-normal text-content-secondary">
                      {comp.abbreviation}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      {/* Save */}
      <SaveScenarioButton
        calculatorType="uk-transfer-tax"
        inputs={inputs as Record<string, unknown>}
        outputs={outputs as unknown as Record<string, unknown> | null}
        headlineLabel={`Total ${taxLabel}`}
        headlineValue={headlineValue}
      />

      {/* Disclaimer */}
      <p className="text-xs text-content-secondary leading-relaxed">
        Rates are based on current UK legislation (SDLT from April 2025, LBTT, LTT). This is an
        estimate only — consult a solicitor or conveyancer for a binding figure. Rates are updated
        periodically but may not reflect very recent changes.
      </p>
    </>
  );

  return (
    <CalculatorLayout
      title="UK Stamp Duty Calculator"
      subtitle="Calculate SDLT, LBTT, or LTT for property purchases in England & Northern Ireland, Scotland, or Wales."
      metaTitle="UK Stamp Duty Calculator 2026 — SDLT, LBTT & LTT Rates | PropertyHack"
      metaDescription="Calculate UK property transfer tax across all three systems. Covers England & Northern Ireland (SDLT), Scotland (LBTT), and Wales (LTT) with first-time buyer and additional property rates."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Tools', href: '/tools' },
        { label: 'UK Stamp Duty Calculator' },
      ]}
      jsonLd={jsonLd}
      inputs={inputPanel}
      results={resultsPanel}
    />
  );
};

export default UkTransferTaxCalculator;
