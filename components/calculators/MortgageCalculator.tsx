import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import CalculatorLayout from './CalculatorLayout';
import CurrencyInput from './shared/CurrencyInput';
import SliderInput from './shared/SliderInput';
import PercentageInput from './shared/PercentageInput';
import ResultCard from './shared/ResultCard';
import ExpandableSection from './shared/ExpandableSection';
import ShareButton from './shared/ShareButton';
import SaveScenarioButton from './shared/SaveScenarioButton';
import { useCalculator } from '../../hooks/useCalculator';
import { useMarketCurrency } from '../../hooks/useMarketCurrency';

interface MortgageInputs extends Record<string, unknown> {
  propertyPrice: number;
  deposit: number;
  loanTermYears: number;
  interestRate: number;
  repaymentType: 'PI' | 'IO';
  frequency: 'weekly' | 'fortnightly' | 'monthly';
}

interface ChartDataPoint {
  year: number;
  principalPaid: number;
  interestPaid: number;
  balance: number;
}

interface YearlyBreakdown {
  year: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

interface MortgageOutputs extends Record<string, unknown> {
  repaymentAmount: number;
  totalInterest: number;
  totalRepaid: number;
  lvr: number;
  lmiWarning: boolean;
  chartData: ChartDataPoint[];
  yearlyBreakdown: YearlyBreakdown[];
}

const DEFAULT_INPUTS: MortgageInputs = {
  propertyPrice: 75000000,   // $750,000
  deposit: 15000000,          // $150,000
  loanTermYears: 30,
  interestRate: 6.5,
  repaymentType: 'PI',
  frequency: 'monthly',
};

function frequencyLabel(freq: string): string {
  if (freq === 'weekly') return 'week';
  if (freq === 'fortnightly') return 'fortnight';
  return 'month';
}

const BREADCRUMBS = [
  { label: 'Home', path: '/' },
  { label: 'Tools', path: '/tools' },
  { label: 'Mortgage Calculator' },
];

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Mortgage Calculator',
  description: 'Calculate your Australian mortgage repayments, total interest, and view an amortisation schedule.',
  url: 'https://propertyhack.com.au/tools/mortgage-calculator',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'AUD',
  },
};

const MortgageCalculator: React.FC = () => {
  const { inputs, outputs, isCalculating, setInput, reset } =
    useCalculator<MortgageInputs, MortgageOutputs>('mortgage', DEFAULT_INPUTS);
  const { locale, currency, currencySymbol, formatCents } = useMarketCurrency();

  const mortgageOutputs = outputs as MortgageOutputs | null;

  // Deposit mode: 'amount' or 'percent'
  const [depositMode, setDepositMode] = useState<'amount' | 'percent'>('amount');

  const depositPercent =
    inputs.propertyPrice > 0
      ? ((inputs.deposit / inputs.propertyPrice) * 100).toFixed(1)
      : '0.0';

  const handleDepositPercentChange = (pct: number) => {
    const cents = Math.round((pct / 100) * inputs.propertyPrice);
    setInput('deposit', cents);
  };

  const repaymentLabel = mortgageOutputs
    ? `${formatCents(mortgageOutputs.repaymentAmount)} / ${frequencyLabel(inputs.frequency)}`
    : '—';

  const chartData =
    mortgageOutputs?.chartData?.map((d) => ({
      year: d.year,
      Principal: Math.round(d.principalPaid) / 100,
      Interest: Math.round(d.interestPaid) / 100,
    })) ?? [];

  const inputsSection = (
    <>
      <CurrencyInput
        label="Property Price"
        value={inputs.propertyPrice}
        onChange={(v) => setInput('propertyPrice', v)}
        min={0}
        max={10000000000}
        locale={locale}
        currencySymbol={currencySymbol}
      />

      {/* Deposit with AUD/% toggle */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-content">Deposit</span>
          <div className="flex rounded-lg border border-base-300 overflow-hidden text-xs font-medium">
            <button
              type="button"
              onClick={() => setDepositMode('amount')}
              className={`px-3 py-1 transition-colors ${
                depositMode === 'amount'
                  ? 'bg-brand-gold text-brand-primary'
                  : 'bg-base-100 text-content-secondary hover:bg-base-200'
              }`}
            >
              {currency}
            </button>
            <button
              type="button"
              onClick={() => setDepositMode('percent')}
              className={`px-3 py-1 transition-colors ${
                depositMode === 'percent'
                  ? 'bg-brand-gold text-brand-primary'
                  : 'bg-base-100 text-content-secondary hover:bg-base-200'
              }`}
            >
              %
            </button>
          </div>
        </div>

        {depositMode === 'amount' ? (
          <CurrencyInput
            label=""
            value={inputs.deposit}
            onChange={(v) => setInput('deposit', v)}
            min={0}
            max={inputs.propertyPrice}
            hint={`${depositPercent}% of property price`}
            locale={locale}
            currencySymbol={currencySymbol}
          />
        ) : (
          <PercentageInput
            label=""
            value={parseFloat(depositPercent)}
            onChange={handleDepositPercentChange}
            min={0}
            max={100}
            step={0.1}
            hint={`${formatCents(inputs.deposit)} deposit`}
          />
        )}
      </div>

      <SliderInput
        label="Loan Term"
        value={inputs.loanTermYears}
        onChange={(v) => setInput('loanTermYears', v)}
        min={1}
        max={30}
        step={1}
        unit="years"
      />

      <PercentageInput
        label="Interest Rate (p.a.)"
        value={inputs.interestRate}
        onChange={(v) => setInput('interestRate', v)}
        min={0}
        max={20}
        step={0.05}
      />

      {/* Repayment type toggle */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-content">Repayment Type</span>
        <div className="flex rounded-lg border border-base-300 overflow-hidden text-sm font-medium">
          {(['PI', 'IO'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setInput('repaymentType', type)}
              className={`flex-1 py-2.5 transition-colors ${
                inputs.repaymentType === type
                  ? 'bg-brand-gold text-brand-primary'
                  : 'bg-base-100 text-content-secondary hover:bg-base-200'
              }`}
            >
              {type === 'PI' ? 'Principal & Interest' : 'Interest Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Frequency select */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="frequency-select" className="text-sm font-medium text-content">
          Repayment Frequency
        </label>
        <select
          id="frequency-select"
          value={inputs.frequency}
          onChange={(e) => setInput('frequency', e.target.value as MortgageInputs['frequency'])}
          className="w-full px-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
        >
          <option value="monthly">Monthly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-base-300">
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

  const resultsSection = (
    <>
      {isCalculating && (
        <div className="flex items-center justify-center py-8 text-content-secondary text-sm">
          Calculating…
        </div>
      )}

      {!isCalculating && mortgageOutputs && (
        <>
          {/* Headline result */}
          <ResultCard
            label={`Repayment per ${frequencyLabel(inputs.frequency)}`}
            value={repaymentLabel}
            subtitle={`${inputs.repaymentType === 'PI' ? 'Principal & Interest' : 'Interest Only'} · ${inputs.loanTermYears} year${inputs.loanTermYears !== 1 ? 's' : ''}`}
          />

          {/* LMI warning */}
          {mortgageOutputs.lmiWarning && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                <strong>LMI likely applies.</strong> Your LVR is {mortgageOutputs.lvr.toFixed(1)}% — lenders typically require Lenders Mortgage Insurance above 80% LVR.
              </span>
            </div>
          )}

          {/* Summary stats */}
          <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">LVR</span>
              <span className={`font-medium ${mortgageOutputs.lvr > 80 ? 'text-amber-700' : 'text-content'}`}>
                {mortgageOutputs.lvr.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Loan amount</span>
              <span className="font-medium text-content">
                {formatCents(inputs.propertyPrice - inputs.deposit)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Total interest</span>
              <span className="font-medium text-content">
                {formatCents(mortgageOutputs.totalInterest)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-base-300 pt-3">
              <span className="text-content-secondary font-medium">Total repaid</span>
              <span className="font-bold text-brand-primary">
                {formatCents(mortgageOutputs.totalRepaid)}
              </span>
            </div>
          </div>

          {/* Amortisation chart */}
          {chartData.length > 0 && (
            <div className="bg-base-100 border border-base-300 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-brand-primary mb-4">Principal vs Interest Over Time</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2b2b2b" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#2b2b2b" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d4b038" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#d4b038" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Year', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#6b7280' }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(locale, { style: 'currency', currency, maximumFractionDigits: 0 }),
                      name,
                    ]}
                    labelFormatter={(label: number) => `Year ${label}`}
                    contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Principal"
                    stackId="1"
                    stroke="#2b2b2b"
                    fill="url(#colorPrincipal)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="Interest"
                    stackId="1"
                    stroke="#d4b038"
                    fill="url(#colorInterest)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Save scenario */}
          <SaveScenarioButton
            calculatorType="mortgage"
            inputs={inputs}
            outputs={mortgageOutputs}
            headlineLabel={`Repayment / ${frequencyLabel(inputs.frequency)}`}
            headlineValue={repaymentLabel}
          />
        </>
      )}

      {!isCalculating && !mortgageOutputs && (
        <div className="bg-base-100 border border-base-300 rounded-xl p-8 text-center text-content-secondary text-sm">
          Enter your loan details to see repayment estimates.
        </div>
      )}
    </>
  );

  const footerSection =
    !isCalculating && mortgageOutputs?.yearlyBreakdown?.length ? (
      <ExpandableSection title="Yearly Breakdown" defaultOpen={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-content-secondary border-b border-base-300">
                <th className="pb-2 pr-4 font-medium">Year</th>
                <th className="pb-2 pr-4 font-medium text-right">Annual Payment</th>
                <th className="pb-2 pr-4 font-medium text-right">Principal</th>
                <th className="pb-2 pr-4 font-medium text-right">Interest</th>
                <th className="pb-2 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {mortgageOutputs.yearlyBreakdown.map((row) => (
                <tr key={row.year} className="border-b border-base-200 last:border-0">
                  <td className="py-2 pr-4 text-content">{row.year}</td>
                  <td className="py-2 pr-4 text-right text-content">{formatCents(row.payment)}</td>
                  <td className="py-2 pr-4 text-right text-content">{formatCents(row.principal)}</td>
                  <td className="py-2 pr-4 text-right text-brand-gold">{formatCents(row.interest)}</td>
                  <td className="py-2 text-right font-medium text-content">{formatCents(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ExpandableSection>
    ) : null;

  return (
    <CalculatorLayout
      title="Mortgage Repayment Calculator"
      subtitle="Calculate your Australian mortgage repayments, compare P&I vs interest-only, and view your full amortisation schedule."
      metaTitle="Mortgage Calculator | PropertyHack"
      metaDescription="Calculate your Australian mortgage repayments. Enter your property price, deposit, loan term and interest rate to see weekly, fortnightly or monthly repayments with a full amortisation chart."
      breadcrumbs={BREADCRUMBS}
      jsonLd={JSON_LD}
      inputs={inputsSection}
      results={resultsSection}
      footer={footerSection}
    />
  );
};

export default MortgageCalculator;
