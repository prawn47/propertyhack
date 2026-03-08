import React, { useState, useCallback } from 'react';
import CalculatorLayout from './CalculatorLayout';
import CurrencyInput from './shared/CurrencyInput';
import ResultCard from './shared/ResultCard';
import ShareButton from './shared/ShareButton';
import SaveScenarioButton from './shared/SaveScenarioButton';
import SeoHead from '../shared/SeoHead';

type BuyerType = 'owner_occupier' | 'investor';

interface NzBuyingCostsInputs {
  propertyPrice: number;
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
  loanAmount: number;
  lvrPercent: number;
  lineItems: LineItem[];
  lowEquityPremium: number | null;
  lowEquityPremiumNote: string | null;
  totalMin: number;
  totalMax: number;
  notes: string[];
}

const DEFAULT_INPUTS: NzBuyingCostsInputs = {
  propertyPrice: 750000,
  buyerType: 'owner_occupier',
  firstHomeBuyer: false,
  depositPercentage: 20,
  newBuild: false,
};

const SITE_URL = 'https://propertyhack.com.au';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Buying Costs Calculator NZ — No Stamp Duty',
    description:
      'Estimate your total buying costs for New Zealand property. New Zealand has no stamp duty or transfer tax — this calculator covers legal fees, inspections, valuations, LIM reports, and low equity premiums.',
    url: `${SITE_URL}/tools/nz/buying-costs-calculator`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'NZD',
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
        name: 'NZ Buying Costs Calculator',
        item: `${SITE_URL}/tools/nz/buying-costs-calculator`,
      },
    ],
  },
];

function formatNZD(amount: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function computeLocally(inputs: NzBuyingCostsInputs): NzBuyingCostsOutputs {
  const loanAmount = inputs.propertyPrice * (1 - inputs.depositPercentage / 100);
  const lvrPercent = 100 - inputs.depositPercentage;

  const lineItems: LineItem[] = [
    { label: 'Legal / conveyancing fees', min: 1400, max: 2500, note: 'Varies by complexity and solicitor' },
    { label: 'Building inspection', min: 500, max: 800, note: 'Recommended for all purchases' },
    { label: 'Valuation / registered valuer', min: 500, max: 800, note: 'Required by most lenders' },
    { label: 'LIM report', min: 300, max: 400, note: 'Land Information Memorandum from the council' },
  ];

  let lowEquityPremium: number | null = null;
  let lowEquityPremiumNote: string | null = null;

  if (lvrPercent > 80) {
    if (inputs.firstHomeBuyer) {
      lowEquityPremium = Math.round(loanAmount * 0.012);
      lowEquityPremiumNote = 'First Home Loan: approximately 1.2% of loan amount (one-off fee). Varies by lender.';
    } else {
      lowEquityPremium = Math.round(loanAmount * 0.012);
      lowEquityPremiumNote = 'Low equity premium: 0.5%–2% rate add-on or one-off fee of ~1.2% of loan. Varies by lender — confirm before applying.';
    }
  }

  const baseMin = lineItems.reduce((s, i) => s + i.min, 0);
  const baseMax = lineItems.reduce((s, i) => s + i.max, 0);
  const totalMin = baseMin + (lowEquityPremium ?? 0);
  const totalMax = baseMax + (lowEquityPremium ?? 0);

  const notes: string[] = [];
  if (inputs.newBuild) {
    notes.push('New build: 15% GST is typically included in the purchase price. Confirm with your solicitor.');
  }
  if (inputs.buyerType === 'investor') {
    notes.push('Bright-line test: If you sell this property within 2 years, any profit may be taxed as income.');
    notes.push('Interest deductibility: From April 2025, 100% of mortgage interest is deductible against rental income.');
  }

  return {
    noTransferTax: true,
    noTransferTaxNote: 'New Zealand has no stamp duty or land transfer tax.',
    loanAmount,
    lvrPercent,
    lineItems,
    lowEquityPremium,
    lowEquityPremiumNote,
    totalMin,
    totalMax,
    notes,
  };
}

const NzBuyingCostsCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<NzBuyingCostsInputs>(DEFAULT_INPUTS);
  const [outputs, setOutputs] = useState<NzBuyingCostsOutputs>(computeLocally(DEFAULT_INPUTS));
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setInput = useCallback(<K extends keyof NzBuyingCostsInputs>(key: K, value: NzBuyingCostsInputs[K]) => {
    setInputs((prev) => {
      const next = { ...prev, [key]: value };
      setOutputs(computeLocally(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
    setOutputs(computeLocally(DEFAULT_INPUTS));
    setError(null);
  }, []);

  const inputPanel = (
    <>
      <h2 className="text-base font-semibold text-brand-primary">Property Details</h2>

      <CurrencyInput
        label="Property Price (NZD)"
        value={inputs.propertyPrice}
        onChange={(v) => setInput('propertyPrice', v)}
        min={100_000}
        max={20_000_000}
        hint="Enter the purchase price in New Zealand dollars"
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-content">Buyer Type</label>
        <div className="flex gap-3">
          {[
            { value: 'owner_occupier' as BuyerType, label: 'Owner-occupier' },
            { value: 'investor' as BuyerType, label: 'Investor' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setInput('buyerType', opt.value)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                inputs.buyerType === opt.value
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-base-100 text-content border-base-200 hover:border-brand-gold'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-content">
          Deposit — {inputs.depositPercentage}%
        </label>
        <input
          type="range"
          min={5}
          max={50}
          step={1}
          value={inputs.depositPercentage}
          onChange={(e) => setInput('depositPercentage', Number(e.target.value))}
          className="w-full accent-brand-gold"
        />
        <p className="text-xs text-content-secondary">
          Deposit: {formatNZD(inputs.propertyPrice * inputs.depositPercentage / 100)} &nbsp;·&nbsp;
          Loan: {formatNZD(inputs.propertyPrice * (1 - inputs.depositPercentage / 100))}
        </p>
        {inputs.depositPercentage < 20 && (
          <p className="text-xs text-amber-600 mt-1">
            LVR {100 - inputs.depositPercentage}% — low equity premium may apply
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          id="first-home"
          type="checkbox"
          checked={inputs.firstHomeBuyer}
          onChange={(e) => setInput('firstHomeBuyer', e.target.checked)}
          className="accent-brand-gold w-4 h-4"
        />
        <label htmlFor="first-home" className="text-sm text-content cursor-pointer">
          First home buyer
        </label>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="new-build"
          type="checkbox"
          checked={inputs.newBuild}
          onChange={(e) => setInput('newBuild', e.target.checked)}
          className="accent-brand-gold w-4 h-4"
        />
        <label htmlFor="new-build" className="text-sm text-content cursor-pointer">
          New build property
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <ShareButton />
        <SaveScenarioButton
          inputs={inputs as Record<string, unknown>}
          outputs={outputs as unknown as Record<string, unknown> | null}
          calculatorType="nz-buying-costs"
          headlineLabel="Estimated Buying Costs"
          headlineValue={`${formatNZD(outputs.totalMin)} – ${formatNZD(outputs.totalMax)}`}
        />
        <button
          type="button"
          onClick={reset}
          className="text-sm text-content-secondary hover:text-brand-primary transition-colors"
        >
          Reset
        </button>
      </div>
    </>
  );

  const resultsPanel = (
    <>
      <div className="bg-brand-primary rounded-xl p-5 text-white">
        <p className="text-sm text-white/70 mb-1">Stamp duty / transfer tax</p>
        <p className="text-3xl font-bold">$0</p>
        <p className="text-sm text-white/70 mt-1">New Zealand has no stamp duty or transfer tax</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <ResultCard
        label="Estimated Buying Costs"
        value={`${formatNZD(outputs.totalMin)} – ${formatNZD(outputs.totalMax)}`}
        isLoading={isCalculating}
        highlight
      />

      {outputs.lineItems.map((item) => (
        <ResultCard
          key={item.label}
          label={item.label}
          value={`${formatNZD(item.min)} – ${formatNZD(item.max)}`}
          isLoading={isCalculating}
          note={item.note}
        />
      ))}

      {outputs.lowEquityPremium !== null && (
        <ResultCard
          label="Low Equity Premium (est.)"
          value={formatNZD(outputs.lowEquityPremium)}
          isLoading={isCalculating}
          note={outputs.lowEquityPremiumNote ?? undefined}
        />
      )}

      {outputs.notes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-1">
          {outputs.notes.map((note, i) => (
            <p key={i}>{note}</p>
          ))}
        </div>
      )}
    </>
  );

  const footerContent = (
    <div className="p-5 text-sm text-content-secondary space-y-2">
      <p>
        <strong>No stamp duty in New Zealand</strong> — unlike Australia, the UK, Canada, and most other countries, New Zealand does not charge stamp duty or a land transfer tax on property purchases.
      </p>
      <p className="text-xs">
        Cost estimates are indicative only. Actual fees vary by provider, location, and property complexity. Consult a licensed conveyancer or solicitor for accurate quotes.
      </p>
    </div>
  );

  return (
    <>
      <SeoHead
        title="Buying Costs Calculator NZ 2026 — No Stamp Duty"
        description="Calculate buying costs for New Zealand property. NZ has no stamp duty or transfer tax — estimate legal fees, building inspections, valuations, LIM reports, and low equity premiums."
        canonicalUrl="/tools/nz/buying-costs-calculator"
        jsonLd={jsonLd}
      />
      <CalculatorLayout
        title="NZ Buying Costs Calculator"
        subtitle="New Zealand has no stamp duty or transfer tax. Estimate your total costs to buy a property in New Zealand."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Tools', href: '/tools' },
          { label: 'NZ Buying Costs Calculator' },
        ]}
        inputs={inputPanel}
        results={resultsPanel}
        footer={footerContent}
      />
    </>
  );
};

export default NzBuyingCostsCalculator;
