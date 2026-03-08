import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useCalculator } from '../../hooks/useCalculator';
import { useMarketCurrency } from '../../hooks/useMarketCurrency';
import { useCountry } from '../../contexts/CountryContext';
import CalculatorLayout from './CalculatorLayout';
import CurrencyInput from './shared/CurrencyInput';
import ExpandableSection from './shared/ExpandableSection';
import ResultCard from './shared/ResultCard';
import ShareButton from './shared/ShareButton';
import SaveScenarioButton from './shared/SaveScenarioButton';
import marketDefaults from '../../server/config/calculators/marketDefaults.json';

type Market = 'AU' | 'US' | 'UK' | 'CA' | 'NZ';

interface RentalYieldInputs extends Record<string, unknown> {
  purchasePrice: number;
  weeklyRent: number;
  monthlyRent: number;
  rentFrequency: string;
  councilRates: number;
  waterRates: number;
  insurance: number;
  maintenance: number;
  strataFees: number;
  managementFeeRate: number;
  landTax: number;
  groundRent: number;
  propertyTax: number;
  otherExpenses: number;
  interestDeductibilityEnabled: boolean;
  marginalTaxRate: number;
  mortgageBalance: number;
  mortgageInterestRate: number;
}

interface InterestDeductibilityResult {
  annualInterest: number;
  taxSaving: number;
  afterTaxNetIncome: number;
  afterTaxNetYield: number;
}

interface RentalYieldOutputs {
  grossYield: number;
  netYield: number;
  annualRentalIncome: number;
  managementFees: number;
  totalAnnualExpenses: number;
  netAnnualIncome: number;
  interestDeductibility?: InterestDeductibilityResult;
}

const DEFAULT_INPUTS: RentalYieldInputs = {
  purchasePrice: 75000000,
  weeklyRent: 60000,
  monthlyRent: 260000,
  rentFrequency: 'weekly',
  councilRates: 180000,
  waterRates: 120000,
  insurance: 150000,
  maintenance: 100000,
  strataFees: 0,
  managementFeeRate: 8.5,
  landTax: 0,
  groundRent: 0,
  propertyTax: 0,
  otherExpenses: 0,
  interestDeductibilityEnabled: false,
  marginalTaxRate: 33,
  mortgageBalance: 0,
  mortgageInterestRate: 6.5,
};

function formatPercent(pct: number): string {
  return pct.toFixed(2) + '%';
}

function getMarketConfig(market: string) {
  const m = (market in marketDefaults ? market : 'AU') as Market;
  return marketDefaults[m].rentalYield;
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Rental Yield Calculator',
  description: 'Calculate gross and net rental yield for investment properties. Factor in all expenses to find your true return.',
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

const MANAGEMENT_FEE_HINTS: Record<string, string> = {
  AU: 'Typically 7–12% of annual rent',
  US: 'Typically 8–10% of annual rent',
  UK: 'Typically 10–12% of annual rent',
  CA: 'Typically 8–10% of annual rent',
  NZ: 'Typically 7–10% of annual rent',
};

const NZ_MARGINAL_TAX_RATES = [
  { label: '10.5%', value: 10.5 },
  { label: '17.5%', value: 17.5 },
  { label: '30%', value: 30 },
  { label: '33%', value: 33 },
  { label: '39%', value: 39 },
];

const RentalYieldCalculator: React.FC = () => {
  const { inputs, outputs, isCalculating, error, setInput, reset } =
    useCalculator<RentalYieldInputs, RentalYieldOutputs>('rental-yield', DEFAULT_INPUTS);
  const { locale, currencySymbol, formatCents: formatDollars } = useMarketCurrency();
  const { country } = useCountry();
  const market = (country || 'AU') as Market;
  const config = getMarketConfig(market);

  const isWeekly = config.rentFrequency === 'weekly';
  const isUS = market === 'US';
  const isUK = market === 'UK';
  const isNZ = market === 'NZ';
  const showLandTax = (config as { showLandTax?: boolean }).showLandTax ?? false;
  const showGroundRent = (config as { showGroundRent?: boolean }).showGroundRent ?? false;
  const propertyTaxRequired = (config as { propertyTaxRequired?: boolean }).propertyTaxRequired ?? false;
  const showInterestDeductibility = (config as { showInterestDeductibilityToggle?: boolean }).showInterestDeductibilityToggle ?? false;

  const labels = config.labels as {
    propertyTax: string;
    strata: string;
    landTax: string | null;
    groundRent: string | null;
  };

  const out = outputs as RentalYieldOutputs | null;

  const chartData = out
    ? [
        { name: 'Gross Yield', yield: Number(out.grossYield.toFixed(2)) },
        { name: 'Net Yield', yield: Number(out.netYield.toFixed(2)) },
        ...(out.interestDeductibility
          ? [{ name: 'After-Tax Yield', yield: Number(out.interestDeductibility.afterTaxNetYield.toFixed(2)) }]
          : []),
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

      {isWeekly ? (
        <CurrencyInput
          label={config.rentInputLabel}
          value={inputs.weeklyRent}
          onChange={(v) => setInput('weeklyRent', v)}
          min={0}
          hint="Current or expected weekly rental income"
          locale={locale}
          currencySymbol={currencySymbol}
        />
      ) : (
        <CurrencyInput
          label={config.rentInputLabel}
          value={inputs.monthlyRent}
          onChange={(v) => setInput('monthlyRent', v)}
          min={0}
          hint="Current or expected monthly rental income"
          locale={locale}
          currencySymbol={currencySymbol}
        />
      )}

      <ExpandableSection title="Advanced — Expenses">
        {/* Property tax / Council rates — required for US, optional elsewhere */}
        <CurrencyInput
          label={`${labels.propertyTax} (annual)${propertyTaxRequired ? '' : ' — optional'}`}
          value={inputs.propertyTax}
          onChange={(v) => setInput('propertyTax', v)}
          min={0}
          hint={propertyTaxRequired ? `${labels.propertyTax} is the largest ongoing cost for US landlords (typically 0.5–2.5% of property value)` : undefined}
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

        {/* Strata / HOA / Body corporate — label varies by market */}
        <CurrencyInput
          label={`${labels.strata} (annual)`}
          value={inputs.strataFees}
          onChange={(v) => setInput('strataFees', v)}
          min={0}
          locale={locale}
          currencySymbol={currencySymbol}
        />

        {/* UK Ground rent — leasehold properties only */}
        {showGroundRent && (
          <CurrencyInput
            label="Ground Rent (annual) — leasehold only"
            value={inputs.groundRent}
            onChange={(v) => setInput('groundRent', v)}
            min={0}
            hint="Only applies to leasehold properties"
            locale={locale}
            currencySymbol={currencySymbol}
          />
        )}

        {/* Land tax — AU only; included in property tax for US/UK/CA/NZ */}
        {showLandTax && (
          <CurrencyInput
            label="Land Tax (annual)"
            value={inputs.landTax}
            onChange={(v) => setInput('landTax', v)}
            min={0}
            locale={locale}
            currencySymbol={currencySymbol}
          />
        )}

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
          <p className="text-xs text-content-secondary">{MANAGEMENT_FEE_HINTS[market] ?? 'Typically 7–12% of annual rent'}</p>
        </div>

        <CurrencyInput
          label="Other Expenses (annual)"
          value={inputs.otherExpenses}
          onChange={(v) => setInput('otherExpenses', v)}
          min={0}
          locale={locale}
          currencySymbol={currencySymbol}
        />
      </ExpandableSection>

      {/* NZ Interest Deductibility — from April 2025, 100% deductible */}
      {showInterestDeductibility && (
        <div className="flex flex-col gap-3 border border-base-300 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-content">Interest Deductibility</p>
              <p className="text-xs text-content-secondary mt-0.5">From April 2025, NZ investors can deduct 100% of mortgage interest against rental income</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={inputs.interestDeductibilityEnabled}
              onClick={() => setInput('interestDeductibilityEnabled', !inputs.interestDeductibilityEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                inputs.interestDeductibilityEnabled ? 'bg-brand-gold' : 'bg-base-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  inputs.interestDeductibilityEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {inputs.interestDeductibilityEnabled && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-content" htmlFor="marginal-tax">
                  Marginal Tax Rate
                </label>
                <select
                  id="marginal-tax"
                  value={inputs.marginalTaxRate}
                  onChange={(e) => setInput('marginalTaxRate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
                >
                  {NZ_MARGINAL_TAX_RATES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <CurrencyInput
                label="Mortgage Balance"
                value={inputs.mortgageBalance}
                onChange={(v) => setInput('mortgageBalance', v)}
                min={0}
                locale={locale}
                currencySymbol={currencySymbol}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-content" htmlFor="mortgage-rate">
                  Mortgage Interest Rate (%)
                </label>
                <div className="relative">
                  <input
                    id="mortgage-rate"
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    value={inputs.mortgageInterestRate}
                    onChange={(e) => setInput('mortgageInterestRate', parseFloat(e.target.value || '0'))}
                    className="w-full pr-8 pl-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-content-secondary text-sm select-none">%</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

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
            {out.interestDeductibility && (
              <div className="flex justify-between text-sm">
                <span className="text-content-secondary">After-Tax Net Yield (with interest deductibility)</span>
                <span className="font-semibold text-brand-gold">{formatPercent(out.interestDeductibility.afterTaxNetYield)}</span>
              </div>
            )}
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
            {out.interestDeductibility && (
              <div className="pt-2 border-t border-base-300 flex justify-between text-sm">
                <span className="text-content font-medium">After-Tax Net Income</span>
                <span className={`font-bold ${out.interestDeductibility.afterTaxNetIncome >= 0 ? 'text-brand-gold' : 'text-red-600'}`}>
                  {formatDollars(out.interestDeductibility.afterTaxNetIncome)}
                </span>
              </div>
            )}
          </div>

          {out.interestDeductibility && (
            <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-brand-primary mb-1">Interest Deductibility Breakdown</h2>
              <div className="flex justify-between text-xs text-content-secondary">
                <span>Annual Mortgage Interest</span>
                <span>{formatDollars(out.interestDeductibility.annualInterest)}</span>
              </div>
              <div className="flex justify-between text-xs text-content-secondary">
                <span>Tax Saving (100% deductible)</span>
                <span>{formatDollars(out.interestDeductibility.taxSaving)}</span>
              </div>
            </div>
          )}

          {out.totalAnnualExpenses > 0 && (
            <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-brand-primary mb-1">Expense Breakdown</h2>
              {inputs.propertyTax > 0 && (
                <div className="flex justify-between text-xs text-content-secondary">
                  <span>{labels.propertyTax}</span>
                  <span>{formatDollars(inputs.propertyTax)}</span>
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
                  <span>{labels.strata}</span>
                  <span>{formatDollars(inputs.strataFees)}</span>
                </div>
              )}
              {inputs.groundRent > 0 && showGroundRent && (
                <div className="flex justify-between text-xs text-content-secondary">
                  <span>Ground Rent</span>
                  <span>{formatDollars(inputs.groundRent)}</span>
                </div>
              )}
              {out.managementFees > 0 && (
                <div className="flex justify-between text-xs text-content-secondary">
                  <span>Management Fees</span>
                  <span>{formatDollars(out.managementFees)}</span>
                </div>
              )}
              {inputs.landTax > 0 && showLandTax && (
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

          <div className="bg-base-100 border border-base-300 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-brand-primary mb-4">Yield Comparison</h2>
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

          <p className="text-xs text-content-secondary bg-base-200 rounded-lg px-4 py-3">
            <strong>Benchmark:</strong> Generally, a gross yield above 5% is considered strong for an investment property.
            {isUS && ' US property taxes significantly affect net yield — ensure you enter your local rate (typically 0.5–2.5% of property value annually).'}
            {isNZ && ' From April 2025, NZ investors can deduct 100% of mortgage interest — use the Interest Deductibility toggle above to see your after-tax return.'}
            {isUK && ' Leasehold properties may have ongoing ground rent — include it in expenses for an accurate net yield.'}
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
      metaDescription="Calculate gross and net rental yield for investment properties. Enter your purchase price, rental income, and expenses to find your true return."
      jsonLd={JSON_LD}
      breadcrumbs={BREADCRUMBS}
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
};

export default RentalYieldCalculator;
