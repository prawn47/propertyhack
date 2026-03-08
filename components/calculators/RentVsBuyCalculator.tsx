import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useCalculator } from '../../hooks/useCalculator';
import { useMarketCurrency } from '../../hooks/useMarketCurrency';
import CurrencyInput from './shared/CurrencyInput';
import PercentageInput from './shared/PercentageInput';
import SliderInput from './shared/SliderInput';
import ResultCard from './shared/ResultCard';
import ShareButton from './shared/ShareButton';
import SaveScenarioButton from './shared/SaveScenarioButton';
import ExpandableSection from './shared/ExpandableSection';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

interface RentVsBuyInputs extends Record<string, unknown> {
  purchasePrice: number;
  weeklyRent: number;
  availableDeposit: number;
  mortgageRate: number;
  loanTermYears: number;
  propertyGrowthRate: number;
  rentIncreaseRate: number;
  investmentReturnRate: number;
}

interface SnapshotRow {
  year: number;
  buyNetPosition: number;
  rentNetPosition: number;
  propertyValue: number;
  loanBalance: number;
  investmentValue: number;
  annualRent: number;
}

interface ChartPoint {
  year: number;
  buyWealth: number;
  rentWealth: number;
}

interface RentVsBuyOutputs {
  breakEvenYear: number | null;
  summaryStatement: string;
  snapshots: SnapshotRow[];
  chartData: ChartPoint[];
  yearlyBreakdown: Array<{
    year: number;
    propertyValue: number;
    loanBalance: number;
    buyEquity: number;
    annualRent: number;
    investmentValue: number;
  }>;
}

const DEFAULT_INPUTS: RentVsBuyInputs = {
  purchasePrice: 80000000,
  weeklyRent: 60000,
  availableDeposit: 16000000,
  mortgageRate: 6.5,
  loanTermYears: 30,
  propertyGrowthRate: 5,
  rentIncreaseRate: 3,
  investmentReturnRate: 7,
};

const MILESTONE_YEARS = [5, 10, 15, 20, 25, 30];


const CustomTooltip = ({ active, payload, label, formatter }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
  formatter: (v: number) => string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg shadow-medium p-3 text-sm">
      <p className="font-semibold text-brand-primary mb-1.5">Year {label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-content-secondary">{entry.name}:</span>
          <span className="font-medium text-content">{formatter(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

const RentVsBuyCalculator: React.FC = () => {
  const { inputs, outputs, isCalculating, error, setInput, reset } =
    useCalculator<RentVsBuyInputs, RentVsBuyOutputs>('rent-vs-buy', DEFAULT_INPUTS);
  const { locale, currencySymbol, formatDollars, formatChartDollars } = useMarketCurrency();

  const [showFullBreakdown, setShowFullBreakdown] = useState(false);

  const typedOutputs = outputs as RentVsBuyOutputs | null;

  const headlineValue = typedOutputs
    ? typedOutputs.breakEvenYear
      ? `Year ${typedOutputs.breakEvenYear}`
      : 'Never'
    : '—';

  const breakevenSubtitle = typedOutputs
    ? typedOutputs.breakEvenYear
      ? `Buying becomes financially advantageous after ${typedOutputs.breakEvenYear} years`
      : 'Renting + investing outperforms buying over 30 years'
    : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Rent vs Buy Calculator',
    description:
      'Compare the financial outcome of renting vs buying property in Australia. See your breakeven year and wealth comparison over 30 years.',
    url: 'https://propertyhack.com.au/tools/rent-vs-buy-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'AUD',
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://propertyhack.com.au/' },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://propertyhack.com.au/tools' },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Rent vs Buy Calculator',
        item: 'https://propertyhack.com.au/tools/rent-vs-buy-calculator',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <Header />
      <Helmet>
        <title>Rent vs Buy Calculator | PropertyHack</title>
        <meta
          name="description"
          content="Should you rent or buy? Compare the long-term financial outcome with our free Australian rent vs buy calculator. See your breakeven year and wealth comparison chart."
        />
        <link rel="canonical" href="https://propertyhack.com.au/tools/rent-vs-buy-calculator" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-base-200">
        {/* Breadcrumb */}
        <div className="bg-base-100 border-b border-base-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm text-content-secondary">
                <li>
                  <Link to="/" className="hover:text-brand-gold transition-colors">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true" className="select-none">›</li>
                <li>
                  <Link to="/tools" className="hover:text-brand-gold transition-colors">
                    Tools
                  </Link>
                </li>
                <li aria-hidden="true" className="select-none">›</li>
                <li className="text-content font-medium" aria-current="page">
                  Rent vs Buy Calculator
                </li>
              </ol>
            </nav>
          </div>
        </div>

        {/* Page header */}
        <div className="bg-base-100 border-b border-base-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary">
              Rent vs Buy Calculator
            </h1>
            <p className="mt-2 text-content-secondary">
              Compare the long-term financial outcome of renting and investing versus buying
              property in Australia.
            </p>
          </div>
        </div>

        {/* Main layout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* ─── Input panel ─── */}
            <div className="w-full lg:w-[420px] flex-shrink-0">
              <div className="bg-base-100 rounded-xl shadow-soft p-6 flex flex-col gap-5">
                <h2 className="text-base font-semibold text-brand-primary">Your Details</h2>

                <CurrencyInput
                  label="Purchase Price"
                  value={inputs.purchasePrice}
                  onChange={(v) => setInput('purchasePrice', v)}
                  min={1000000}
                  hint="Total property purchase price"
                  locale={locale}
                  currencySymbol={currencySymbol}
                />

                <CurrencyInput
                  label="Deposit"
                  value={inputs.availableDeposit}
                  onChange={(v) => setInput('availableDeposit', v)}
                  min={0}
                  hint="Upfront deposit amount"
                  locale={locale}
                  currencySymbol={currencySymbol}
                />

                <CurrencyInput
                  label="Weekly Rent"
                  value={inputs.weeklyRent}
                  onChange={(v) => setInput('weeklyRent', v)}
                  min={100}
                  hint="Current weekly rent you pay (or would pay)"
                  locale={locale}
                  currencySymbol={currencySymbol}
                />

                <PercentageInput
                  label="Mortgage Interest Rate"
                  value={inputs.mortgageRate}
                  onChange={(v) => setInput('mortgageRate', v)}
                  min={0.1}
                  max={20}
                  step={0.01}
                />

                <SliderInput
                  label="Loan Term"
                  value={inputs.loanTermYears}
                  onChange={(v) => setInput('loanTermYears', v)}
                  min={10}
                  max={30}
                  step={1}
                  unit="yrs"
                />

                <ExpandableSection title="Advanced assumptions">
                  <PercentageInput
                    label="Property Growth Rate (p.a.)"
                    value={inputs.propertyGrowthRate}
                    onChange={(v) => setInput('propertyGrowthRate', v)}
                    min={0}
                    max={20}
                    step={0.1}
                    hint="Expected annual capital growth"
                  />
                  <PercentageInput
                    label="Annual Rent Increase"
                    value={inputs.rentIncreaseRate}
                    onChange={(v) => setInput('rentIncreaseRate', v)}
                    min={0}
                    max={20}
                    step={0.1}
                    hint="Expected annual rent increase"
                  />
                  <PercentageInput
                    label="Investment Return Rate (p.a.)"
                    value={inputs.investmentReturnRate}
                    onChange={(v) => setInput('investmentReturnRate', v)}
                    min={0}
                    max={20}
                    step={0.1}
                    hint="Return on deposit invested (renter's alternative)"
                  />
                </ExpandableSection>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={reset}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-content border border-base-300 rounded-lg hover:border-brand-gold hover:text-brand-gold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-1"
                  >
                    Reset
                  </button>
                  <ShareButton />
                </div>
              </div>
            </div>

            {/* ─── Results panel ─── */}
            <div className="flex-1 min-w-0 flex flex-col gap-6">

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm"
                >
                  {error}
                </div>
              )}

              {/* Loading shimmer */}
              {isCalculating && !typedOutputs && (
                <div className="bg-base-100 rounded-xl shadow-soft p-6 animate-pulse">
                  <div className="h-5 bg-base-300 rounded w-32 mb-3" />
                  <div className="h-10 bg-base-300 rounded w-24" />
                </div>
              )}

              {typedOutputs && (
                <>
                  {/* Headline + summary */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <ResultCard
                        label="Breakeven Year"
                        value={headlineValue}
                        subtitle={breakevenSubtitle}
                      />
                    </div>
                  </div>

                  {typedOutputs.summaryStatement && (
                    <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-xl px-5 py-4 text-sm text-content leading-relaxed">
                      {typedOutputs.summaryStatement}
                    </div>
                  )}

                  {/* Milestones table */}
                  {typedOutputs.snapshots?.length > 0 && (
                    <div className="bg-base-100 rounded-xl shadow-soft p-5">
                      <h2 className="text-sm font-semibold text-brand-primary mb-4">
                        Net Position at Key Milestones
                      </h2>
                      <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-sm min-w-[500px]">
                          <thead>
                            <tr className="border-b border-base-300">
                              <th className="text-left py-2 px-2 text-content-secondary font-medium">
                                Year
                              </th>
                              <th className="text-right py-2 px-2 text-content-secondary font-medium">
                                Buy wealth
                              </th>
                              <th className="text-right py-2 px-2 text-content-secondary font-medium">
                                Rent + invest
                              </th>
                              <th className="text-right py-2 px-2 text-content-secondary font-medium">
                                Difference
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {typedOutputs.snapshots.map((row) => {
                              const difference = row.buyNetPosition - row.rentNetPosition;
                              const buyAhead = difference > 0;
                              return (
                                <tr
                                  key={row.year}
                                  className="border-b border-base-200 last:border-0"
                                >
                                  <td className="py-2.5 px-2 font-medium text-brand-primary">
                                    Year {row.year}
                                  </td>
                                  <td className="py-2.5 px-2 text-right text-content">
                                    {formatDollars(row.buyNetPosition)}
                                  </td>
                                  <td className="py-2.5 px-2 text-right text-content">
                                    {formatDollars(row.rentNetPosition)}
                                  </td>
                                  <td
                                    className={`py-2.5 px-2 text-right font-medium ${
                                      buyAhead ? 'text-green-600' : 'text-red-600'
                                    }`}
                                  >
                                    {buyAhead ? '+' : ''}
                                    {formatDollars(difference)}
                                    <span className="text-xs ml-1 opacity-75">
                                      {buyAhead ? 'buy ahead' : 'rent ahead'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Wealth comparison chart */}
                  {typedOutputs.chartData?.length > 0 && (
                    <div className="bg-base-100 rounded-xl shadow-soft p-5">
                      <h2 className="text-sm font-semibold text-brand-primary mb-4">
                        Wealth Comparison Over 30 Years
                      </h2>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart
                          data={typedOutputs.chartData}
                          margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="year"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: '#6b7280' }}
                            tickFormatter={(v) => `Yr ${v}`}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: '#6b7280' }}
                            tickFormatter={formatChartDollars}
                            width={58}
                          />
                          <Tooltip content={<CustomTooltip formatter={formatChartDollars} />} />
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="buyWealth"
                            name="Buy"
                            stroke="#d4b038"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="rentWealth"
                            name="Rent + Invest"
                            stroke="#0ea5e9"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Save */}
                  <div className="flex justify-end">
                    <SaveScenarioButton
                      calculatorType="rent-vs-buy"
                      inputs={inputs as Record<string, unknown>}
                      outputs={typedOutputs as unknown as Record<string, unknown>}
                      headlineLabel="Breakeven Year"
                      headlineValue={headlineValue}
                    />
                  </div>

                  {/* Expandable year-by-year breakdown */}
                  {typedOutputs.yearlyBreakdown?.length > 0 && (
                    <div className="bg-base-100 rounded-xl shadow-soft px-5 py-1">
                      <ExpandableSection title="Year-by-year breakdown">
                        <div className="overflow-x-auto -mx-1">
                          <table className="w-full text-xs min-w-[640px]">
                            <thead>
                              <tr className="border-b border-base-300">
                                <th className="text-left py-2 px-2 text-content-secondary font-medium">Year</th>
                                <th className="text-right py-2 px-2 text-content-secondary font-medium">Property value</th>
                                <th className="text-right py-2 px-2 text-content-secondary font-medium">Loan balance</th>
                                <th className="text-right py-2 px-2 text-content-secondary font-medium">Buy equity</th>
                                <th className="text-right py-2 px-2 text-content-secondary font-medium">Annual rent</th>
                                <th className="text-right py-2 px-2 text-content-secondary font-medium">Rent portfolio</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(showFullBreakdown
                                ? typedOutputs.yearlyBreakdown
                                : typedOutputs.yearlyBreakdown.slice(0, 10)
                              ).map((row) => (
                                <tr
                                  key={row.year}
                                  className="border-b border-base-200 last:border-0"
                                >
                                  <td className="py-2 px-2 font-medium text-brand-primary">{row.year}</td>
                                  <td className="py-2 px-2 text-right text-content">{formatDollars(row.propertyValue)}</td>
                                  <td className="py-2 px-2 text-right text-content">{formatDollars(row.loanBalance)}</td>
                                  <td className="py-2 px-2 text-right text-content">{formatDollars(row.buyEquity)}</td>
                                  <td className="py-2 px-2 text-right text-content">{formatDollars(row.annualRent)}</td>
                                  <td className="py-2 px-2 text-right text-content">{formatDollars(row.investmentValue)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {typedOutputs.yearlyBreakdown.length > 10 && (
                          <button
                            type="button"
                            onClick={() => setShowFullBreakdown((p) => !p)}
                            className="text-sm text-brand-gold hover:text-brand-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-1 rounded"
                          >
                            {showFullBreakdown
                              ? 'Show less'
                              : `Show all ${typedOutputs.yearlyBreakdown.length} years`}
                          </button>
                        )}
                      </ExpandableSection>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <p className="text-xs text-content-secondary leading-relaxed">
                    This calculator provides estimates only and does not constitute financial advice.
                    Figures assume constant growth rates and do not account for taxes, transaction costs,
                    maintenance, insurance, or other ownership expenses. Consult a qualified financial
                    adviser before making property decisions.
                  </p>
                </>
              )}

              {/* Empty state when no results yet */}
              {!isCalculating && !typedOutputs && !error && (
                <div className="bg-base-100 rounded-xl shadow-soft p-10 text-center text-content-secondary text-sm">
                  Enter your details on the left to see a wealth comparison.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default RentVsBuyCalculator;
