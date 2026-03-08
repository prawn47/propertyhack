import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useCalculator } from '../../hooks/useCalculator';
import { useMarketCurrency } from '../../hooks/useMarketCurrency';
import CalculatorLayout from './CalculatorLayout';
import CurrencyInput from './shared/CurrencyInput';
import ExpandableSection from './shared/ExpandableSection';
import ResultCard from './shared/ResultCard';
import ShareButton from './shared/ShareButton';
import SaveScenarioButton from './shared/SaveScenarioButton';

interface RentalYieldInputs extends Record<string, unknown> {
  purchasePrice: number;
  weeklyRent: number;
  councilRates: number;
  waterRates: number;
  insurance: number;
  maintenance: number;
  strataFees: number;
  managementFeeRate: number;
  landTax: number;
  otherExpenses: number;
}

interface RentalYieldOutputs {
  grossYield: number;
  netYield: number;
  annualRentalIncome: number;
  managementFees: number;
  totalAnnualExpenses: number;
  netAnnualIncome: number;
}

const DEFAULT_INPUTS: RentalYieldInputs = {
  purchasePrice: 75000000,
  weeklyRent: 60000,
  councilRates: 180000,
  waterRates: 120000,
  insurance: 150000,
  maintenance: 100000,
  strataFees: 0,
  managementFeeRate: 8.5,
  landTax: 0,
  otherExpenses: 0,
};

function formatPercent(pct: number): string {
  return pct.toFixed(2) + '%';
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Rental Yield Calculator',
  description: 'Calculate gross and net rental yield for investment properties in Australia. Factor in all expenses to find your true return.',
  url: 'https://propertyhack.com.au/tools/rental-yield-calculator',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'AUD',
  },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://propertyhack.com.au/' },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://propertyhack.com.au/tools' },
      { '@type': 'ListItem', position: 3, name: 'Rental Yield Calculator', item: 'https://propertyhack.com.au/tools/rental-yield-calculator' },
    ],
  },
};

const BREADCRUMBS = [
  { label: 'Home', href: '/' },
  { label: 'Tools', href: '/tools' },
  { label: 'Rental Yield Calculator' },
];

const RentalYieldCalculator: React.FC = () => {
  const { inputs, outputs, isCalculating, error, setInput, reset } =
    useCalculator<RentalYieldInputs, RentalYieldOutputs>('rental-yield', DEFAULT_INPUTS);
  const { locale, currencySymbol, formatCents: formatDollars } = useMarketCurrency();

  const out = outputs as RentalYieldOutputs | null;

  const chartData = out
    ? [
        { name: 'Gross Yield', yield: Number(out.grossYield.toFixed(2)) },
        { name: 'Net Yield', yield: Number(out.netYield.toFixed(2)) },
      ]
    : [];

  const headlineValue = out ? formatPercent(out.grossYield) : '–';

  const inputPanel = (
    <>
      <CurrencyInput
        label="Purchase Price"
        value={inputs.purchasePrice}
        onChange={(v) => setInput('purchasePrice', v)}
        min={0}
        locale={locale}
        currencySymbol={currencySymbol}
      />
      <CurrencyInput
        label="Weekly Rent"
        value={inputs.weeklyRent}
        onChange={(v) => setInput('weeklyRent', v)}
        min={0}
        hint="Current or expected weekly rental income"
        locale={locale}
        currencySymbol={currencySymbol}
      />

      <ExpandableSection title="Advanced — Expenses">
        <CurrencyInput
          label="Council Rates (annual)"
          value={inputs.councilRates}
          onChange={(v) => setInput('councilRates', v)}
          min={0}
          locale={locale}
          currencySymbol={currencySymbol}
        />
        <CurrencyInput
          label="Water Rates (annual)"
          value={inputs.waterRates}
          onChange={(v) => setInput('waterRates', v)}
          min={0}
          locale={locale}
          currencySymbol={currencySymbol}
        />
        <CurrencyInput
          label="Insurance (annual)"
          value={inputs.insurance}
          onChange={(v) => setInput('insurance', v)}
          min={0}
          locale={locale}
          currencySymbol={currencySymbol}
        />
        <CurrencyInput
          label="Maintenance & Repairs (annual)"
          value={inputs.maintenance}
          onChange={(v) => setInput('maintenance', v)}
          min={0}
          locale={locale}
          currencySymbol={currencySymbol}
        />
        <CurrencyInput
          label="Strata / Body Corporate Fees (annual)"
          value={inputs.strataFees}
          onChange={(v) => setInput('strataFees', v)}
          min={0}
          locale={locale}
          currencySymbol={currencySymbol}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-content" htmlFor="mgmt-fee">
            Property Management Fee (% of rent)
          </label>
          <div className="relative">
            <input
              id="mgmt-fee"
              type="number"
              min={0}
              max={20}
              step={0.1}
              value={inputs.managementFeeRate}
              onChange={(e) => setInput('managementFeeRate', parseFloat(e.target.value || '0'))}
              className="w-full pr-8 pl-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-content-secondary text-sm select-none">%</span>
          </div>
          <p className="text-xs text-content-secondary">Typically 7–12% of annual rent</p>
        </div>
        <CurrencyInput
          label="Land Tax (annual)"
          value={inputs.landTax}
          onChange={(v) => setInput('landTax', v)}
          min={0}
          locale={locale}
          currencySymbol={currencySymbol}
        />
        <CurrencyInput
          label="Other Expenses (annual)"
          value={inputs.otherExpenses}
          onChange={(v) => setInput('otherExpenses', v)}
          min={0}
          locale={locale}
          currencySymbol={currencySymbol}
        />
      </ExpandableSection>

      <div className="flex gap-3 pt-2 border-t border-base-300">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2.5 text-sm font-medium text-content border border-base-300 rounded-lg hover:border-brand-gold hover:text-brand-gold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-1"
        >
          Reset
        </button>
        <ShareButton />
      </div>
    </>
  );

  const resultPanel = (
    <>
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ResultCard
        label="Gross Rental Yield"
        value={out ? formatPercent(out.grossYield) : '–'}
        subtitle={isCalculating ? 'Calculating…' : undefined}
      />

      {out && (
        <>
          <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Net Yield</span>
              <span className="font-semibold text-brand-primary">{formatPercent(out.netYield)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Annual Rental Income</span>
              <span className="font-semibold text-brand-primary">{formatDollars(out.annualRentalIncome)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Total Annual Expenses</span>
              <span className="font-semibold text-brand-primary">{formatDollars(out.totalAnnualExpenses)}</span>
            </div>
            <div className="pt-2 border-t border-base-300 flex justify-between text-sm">
              <span className="text-content font-medium">Net Annual Income</span>
              <span className={`font-bold ${out.netAnnualIncome >= 0 ? 'text-brand-primary' : 'text-red-600'}`}>
                {formatDollars(out.netAnnualIncome)}
              </span>
            </div>
          </div>

          {out.totalAnnualExpenses > 0 && (
            <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-brand-primary mb-1">Expense Breakdown</h2>
              {inputs.councilRates > 0 && (
                <div className="flex justify-between text-xs text-content-secondary">
                  <span>Council Rates</span>
                  <span>{formatDollars(inputs.councilRates)}</span>
                </div>
              )}
              {inputs.waterRates > 0 && (
                <div className="flex justify-between text-xs text-content-secondary">
                  <span>Water Rates</span>
                  <span>{formatDollars(inputs.waterRates)}</span>
                </div>
              )}
              {inputs.insurance > 0 && (
                <div className="flex justify-between text-xs text-content-secondary">
                  <span>Insurance</span>
                  <span>{formatDollars(inputs.insurance)}</span>
                </div>
              )}
              {inputs.maintenance > 0 && (
                <div className="flex justify-between text-xs text-content-secondary">
                  <span>Maintenance</span>
                  <span>{formatDollars(inputs.maintenance)}</span>
                </div>
              )}
              {inputs.strataFees > 0 && (
                <div className="flex justify-between text-xs text-content-secondary">
                  <span>Strata Fees</span>
                  <span>{formatDollars(inputs.strataFees)}</span>
                </div>
              )}
              {out.managementFees > 0 && (
                <div className="flex justify-between text-xs text-content-secondary">
                  <span>Management Fees</span>
                  <span>{formatDollars(out.managementFees)}</span>
                </div>
              )}
              {inputs.landTax > 0 && (
                <div className="flex justify-between text-xs text-content-secondary">
                  <span>Land Tax</span>
                  <span>{formatDollars(inputs.landTax)}</span>
                </div>
              )}
              {inputs.otherExpenses > 0 && (
                <div className="flex justify-between text-xs text-content-secondary">
                  <span>Other</span>
                  <span>{formatDollars(inputs.otherExpenses)}</span>
                </div>
              )}
            </div>
          )}

          {/* Gross vs Net bar chart */}
          <div className="bg-base-100 border border-base-300 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-brand-primary mb-4">Gross vs Net Yield</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 'auto']}
                />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Yield']} />
                <Bar dataKey="yield" fill="#d4b038" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Benchmark note */}
          <p className="text-xs text-content-secondary bg-base-200 rounded-lg px-4 py-3">
            <strong>Benchmark:</strong> Generally, a gross yield above 5% is considered strong for an investment property in Australia.
          </p>

          <SaveScenarioButton
            calculatorType="rental-yield"
            inputs={inputs as Record<string, unknown>}
            outputs={out as unknown as Record<string, unknown>}
            headlineLabel="Gross Yield"
            headlineValue={headlineValue}
          />
        </>
      )}
    </>
  );

  return (
    <CalculatorLayout
      title="Rental Yield Calculator"
      subtitle="Calculate your gross and net rental yield to assess the return on your investment property."
      metaTitle="Rental Yield Calculator | PropertyHack"
      metaDescription="Calculate gross and net rental yield for investment properties in Australia. Enter your purchase price, weekly rent, and expenses to find your true return."
      jsonLd={JSON_LD}
      breadcrumbs={BREADCRUMBS}
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
};

export default RentalYieldCalculator;
