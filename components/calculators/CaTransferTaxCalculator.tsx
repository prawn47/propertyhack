import React from 'react';
import CalculatorLayout from './CalculatorLayout';
import CurrencyInput from './shared/CurrencyInput';
import ResultCard from './shared/ResultCard';
import ShareButton from './shared/ShareButton';
import SaveScenarioButton from './shared/SaveScenarioButton';
import { useCalculator } from '../../hooks/useCalculator';
import SeoHead from '../shared/SeoHead';

const PROVINCES = [
  { value: 'ON', label: 'Ontario' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'QC', label: 'Quebec' },
  { value: 'AB', label: 'Alberta' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'YT', label: 'Yukon' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
];

const ONTARIO_CITIES = [
  { value: 'other', label: 'Other Ontario city' },
  { value: 'Toronto', label: 'Toronto (+ Municipal LTT)' },
];

const QUEBEC_CITIES = [
  { value: 'other', label: 'Other Quebec municipality' },
  { value: 'Montreal', label: 'Montreal (+ higher rates)' },
];

const NOVA_SCOTIA_MUNICIPALITIES = [
  { value: 'Halifax Regional Municipality', label: 'Halifax Regional Municipality (1.5%)' },
  { value: 'Cape Breton Regional Municipality', label: 'Cape Breton Regional Municipality (1.5%)' },
  { value: 'Kings County', label: 'Kings County (1.0%)' },
  { value: 'Pictou County', label: 'Pictou County (1.0%)' },
  { value: 'Annapolis County', label: 'Annapolis County (0.5%)' },
  { value: 'Other', label: 'Other municipality (est. 1.0%)' },
];

const NO_LTT_PROVINCES = new Set(['AB', 'SK', 'NL', 'YT', 'NT', 'NU']);
const HAS_FTB_REBATE_PROVINCES = new Set(['ON', 'BC', 'PE']);

type BuyerType = 'standard' | 'firstTimeBuyer';

interface CaTransferTaxInputs extends Record<string, unknown> {
  propertyPrice: number;
  province: string;
  city: string;
  buyerType: BuyerType;
  isResident: boolean;
  mortgageAmount: number;
  nsMunicipality: string;
}

interface CaTransferTaxOutputs {
  provincialTax: number;
  municipalTax: number;
  nrst: number;
  firstTimeBuyerRebate: number;
  netTax: number;
  totalTax: number;
  effectiveRate: number;
  registrationFees: {
    titleTransfer: number;
    mortgageRegistration: number;
  } | null;
  hasLTT: boolean;
  notes: string[];
  ftbEligibilitySummary: string | null;
  provinceTaxName: string;
}

const DEFAULT_INPUTS: CaTransferTaxInputs = {
  propertyPrice: 70000000,
  province: 'ON',
  city: 'other',
  buyerType: 'standard',
  isResident: true,
  mortgageAmount: 0,
  nsMunicipality: 'Halifax Regional Municipality',
};

function formatCAD(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
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
    name: 'Canada Land Transfer Tax Calculator',
    description: 'Calculate land transfer tax for property purchases across all Canadian provinces and territories. Includes Toronto and Montreal municipal taxes, first-time buyer rebates, and Ontario NRST.',
    url: `${SITE_URL}/ca/tools/land-transfer-tax-calculator`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CAD',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/ca/tools` },
      { '@type': 'ListItem', position: 3, name: 'Land Transfer Tax Calculator', item: `${SITE_URL}/ca/tools/land-transfer-tax-calculator` },
    ],
  },
];

const CaTransferTaxCalculator: React.FC = () => {
  const { inputs, outputs, isCalculating, error, setInput, reset } =
    useCalculator<CaTransferTaxInputs, CaTransferTaxOutputs>('ca-transfer-tax', DEFAULT_INPUTS);

  const isOntario = inputs.province === 'ON';
  const isQuebec = inputs.province === 'QC';
  const isNovaScotia = inputs.province === 'NS';
  const isAlberta = inputs.province === 'AB';
  const isNoLTT = NO_LTT_PROVINCES.has(inputs.province);
  const hasFtbRebate = HAS_FTB_REBATE_PROVINCES.has(inputs.province);
  const showNRST = isOntario && !inputs.isResident;
  const isToronto = isOntario && inputs.city === 'Toronto';
  const isMontreal = isQuebec && inputs.city === 'Montreal';

  const headlineValue = outputs
    ? formatCAD(outputs.netTax)
    : '—';

  const inputPanel = (
    <>
      <h2 className="text-base font-semibold text-brand-primary">Property Details</h2>

      {/* Province */}
      <div className="flex flex-col gap-1">
        <label htmlFor="province-select" className="text-sm font-medium text-content">
          Province / Territory
        </label>
        <select
          id="province-select"
          value={inputs.province}
          onChange={(e) => {
            setInput('province', e.target.value);
            setInput('city', 'other');
          }}
          className="w-full px-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
        >
          {PROVINCES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* City — Ontario */}
      {isOntario && (
        <div className="flex flex-col gap-1">
          <label htmlFor="city-select-on" className="text-sm font-medium text-content">
            City
          </label>
          <select
            id="city-select-on"
            value={inputs.city}
            onChange={(e) => setInput('city', e.target.value)}
            className="w-full px-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
          >
            {ONTARIO_CITIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* City — Quebec */}
      {isQuebec && (
        <div className="flex flex-col gap-1">
          <label htmlFor="city-select-qc" className="text-sm font-medium text-content">
            Municipality
          </label>
          <select
            id="city-select-qc"
            value={inputs.city}
            onChange={(e) => setInput('city', e.target.value)}
            className="w-full px-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
          >
            {QUEBEC_CITIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Municipality — Nova Scotia */}
      {isNovaScotia && (
        <div className="flex flex-col gap-1">
          <label htmlFor="ns-municipality-select" className="text-sm font-medium text-content">
            Municipality
          </label>
          <select
            id="ns-municipality-select"
            value={inputs.nsMunicipality}
            onChange={(e) => setInput('nsMunicipality', e.target.value)}
            className="w-full px-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
          >
            {NOVA_SCOTIA_MUNICIPALITIES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Property Price */}
      <CurrencyInput
        label="Property Price (CAD)"
        value={inputs.propertyPrice}
        onChange={(v) => setInput('propertyPrice', v)}
        min={100_00}
        max={100_000_000_00}
        hint="Enter the purchase price of the property"
      />

      {/* Buyer Type */}
      {hasFtbRebate && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-content">Buyer Type</span>
          <div className="flex flex-col gap-2">
            {(
              [
                { value: 'standard', label: 'Standard Buyer' },
                { value: 'firstTimeBuyer', label: 'First-Time Home Buyer' },
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
      )}

      {/* Resident status — only relevant for Ontario NRST */}
      {isOntario && (
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <span className="text-sm font-medium text-content block">Canadian Citizen or Permanent Resident</span>
            <span className="text-xs text-content-secondary">Affects Non-Resident Speculation Tax (NRST) in Ontario</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={inputs.isResident}
            onClick={() => setInput('isResident', !inputs.isResident)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 ${
              inputs.isResident ? 'bg-brand-gold' : 'bg-base-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                inputs.isResident ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      )}

      {/* Mortgage Amount — for Alberta registration fee */}
      {isAlberta && (
        <CurrencyInput
          label="Mortgage Amount (CAD)"
          value={inputs.mortgageAmount}
          onChange={(v) => setInput('mortgageAmount', v)}
          min={0}
          max={100_000_000_00}
          hint="Used to calculate the Alberta mortgage registration fee (optional)"
        />
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
        label={isNoLTT ? 'Total Registration Fees' : 'Net Tax Payable'}
        value={isCalculating ? 'Calculating…' : headlineValue}
        subtitle={
          outputs && !isNoLTT
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

      {/* No LTT notice */}
      {outputs && isNoLTT && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800 mb-1">No Land Transfer Tax</p>
          <p className="text-sm text-amber-700">
            {inputs.province === 'AB'
              ? 'Alberta does not charge a land transfer tax. Only registration fees apply.'
              : inputs.province === 'SK'
              ? 'Saskatchewan does not charge a land transfer tax. Only a title transfer fee applies.'
              : 'This province/territory does not charge a land transfer tax. Only small registration fees apply.'}
          </p>
        </div>
      )}

      {/* BC foreign buyer ban note */}
      {inputs.province === 'BC' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-800 mb-1">Foreign Buyer Ban</p>
          <p className="text-sm text-blue-700">
            The Prohibition on the Purchase of Residential Property by Non-Canadians Act is in effect until January 2027. The 20% foreign buyer additional tax applies once the ban lifts.
          </p>
        </div>
      )}

      {/* Notes from calculator */}
      {outputs?.notes && outputs.notes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col gap-1.5">
          {outputs.notes.map((note, i) => (
            <p key={i} className="text-sm text-blue-700">{note}</p>
          ))}
        </div>
      )}

      {/* Tax breakdown */}
      {outputs && (
        <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-brand-primary">
            {isNoLTT ? 'Fee Breakdown' : 'Tax Breakdown'}
          </h3>
          <dl className="flex flex-col gap-2 text-sm">
            {/* No LTT — registration fees */}
            {isNoLTT && outputs.registrationFees && (
              <>
                <div className="flex justify-between">
                  <dt className="text-content-secondary">Title Transfer Fee</dt>
                  <dd className="font-medium text-content">{formatCAD(outputs.registrationFees.titleTransfer)}</dd>
                </div>
                {isAlberta && inputs.mortgageAmount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-content-secondary">Mortgage Registration Fee</dt>
                    <dd className="font-medium text-content">{formatCAD(outputs.registrationFees.mortgageRegistration)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-base-300 pt-2">
                  <dt className="font-semibold text-content">Total Fees</dt>
                  <dd className="font-bold text-brand-primary text-base">{formatCAD(outputs.netTax)}</dd>
                </div>
              </>
            )}

            {/* Has LTT */}
            {!isNoLTT && (
              <>
                <div className="flex justify-between">
                  <dt className="text-content-secondary">
                    {outputs.provinceTaxName || 'Provincial Land Transfer Tax'}
                  </dt>
                  <dd className="font-medium text-content">{formatCAD(outputs.provincialTax)}</dd>
                </div>

                {(isToronto || isMontreal) && outputs.municipalTax > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-content-secondary">
                      {isToronto ? 'Toronto Municipal LTT' : 'Montreal Welcome Tax'}
                    </dt>
                    <dd className="font-medium text-content">{formatCAD(outputs.municipalTax)}</dd>
                  </div>
                )}

                {showNRST && outputs.nrst > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-content-secondary">Non-Resident Speculation Tax (25%)</dt>
                    <dd className="font-medium text-red-600">{formatCAD(outputs.nrst)}</dd>
                  </div>
                )}

                {outputs.totalTax !== outputs.provincialTax + outputs.municipalTax + outputs.nrst && (
                  <div className="flex justify-between pt-1">
                    <dt className="text-content-secondary">Total before rebate</dt>
                    <dd className="font-medium text-content">{formatCAD(outputs.totalTax)}</dd>
                  </div>
                )}

                {outputs.firstTimeBuyerRebate > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-content-secondary text-green-700">First-Time Buyer Rebate</dt>
                    <dd className="font-medium text-green-600">−{formatCAD(outputs.firstTimeBuyerRebate)}</dd>
                  </div>
                )}

                <div className="flex justify-between border-t border-base-300 pt-2">
                  <dt className="font-semibold text-content">Net Tax Payable</dt>
                  <dd className="font-bold text-brand-primary text-base">{formatCAD(outputs.netTax)}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      )}

      {/* Effective rate callout */}
      {outputs && !isNoLTT && (
        <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-content-secondary">Effective Tax Rate</p>
            <p className="text-2xl font-bold text-brand-primary">{formatRate(outputs.effectiveRate)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-content-secondary">of property price</p>
            <p className="text-sm font-medium text-content">{formatCAD(inputs.propertyPrice)}</p>
          </div>
        </div>
      )}

      {/* FTB eligibility summary */}
      {outputs?.ftbEligibilitySummary && inputs.buyerType === 'firstTimeBuyer' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-800 mb-1">First-Time Buyer Eligibility</p>
          <p className="text-sm text-green-700">{outputs.ftbEligibilitySummary}</p>
        </div>
      )}

      {/* Save */}
      <SaveScenarioButton
        calculatorType="ca-transfer-tax"
        inputs={inputs as Record<string, unknown>}
        outputs={outputs as unknown as Record<string, unknown> | null}
        headlineLabel={isNoLTT ? 'Total Registration Fees' : 'Net Tax Payable'}
        headlineValue={headlineValue}
      />

      {/* Disclaimer */}
      <p className="text-xs text-content-secondary leading-relaxed">
        Estimates are based on current rate data and may differ from official calculations. Land transfer tax rules and rates vary by province and municipality and change over time. Consult a lawyer or real estate professional for a binding figure.
      </p>
    </>
  );

  return (
    <>
      <SeoHead
        title="Canada Land Transfer Tax Calculator 2026"
        description="Calculate land transfer tax for property purchases across all Canadian provinces and territories. Includes Toronto and Montreal municipal taxes, first-time buyer rebates, and Ontario Non-Resident Speculation Tax."
        canonicalUrl="/ca/tools/land-transfer-tax-calculator"
        jsonLd={jsonLd}
      />
      <CalculatorLayout
        title="Canada Land Transfer Tax Calculator"
        subtitle="Calculate the land transfer tax payable on a property purchase across all Canadian provinces and territories."
        breadcrumbs={[
          { label: 'Home', href: '/ca' },
          { label: 'Tools', href: '/ca/tools' },
          { label: 'Land Transfer Tax Calculator' },
        ]}
        inputs={inputPanel}
        results={resultsPanel}
      />
    </>
  );
};

export default CaTransferTaxCalculator;
