import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useCalculator } from '../../hooks/useCalculator';
import { useMarketCurrency } from '../../hooks/useMarketCurrency';
import { useCountry } from '../../contexts/CountryContext';
import CurrencyInput from './shared/CurrencyInput';
import PercentageInput from './shared/PercentageInput';
import ExpandableSection from './shared/ExpandableSection';
import ResultCard from './shared/ResultCard';
import ShareButton from './shared/ShareButton';
import SaveScenarioButton from './shared/SaveScenarioButton';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

// Market defaults — assessment rate and student debt treatment per market
const MARKET_DEFAULTS: Record<string, {
  assessmentRate: number;
  studentDebtTreatment: 'income_based' | 'income_threshold' | 'monthly_payment' | 'uk_plan';
  studentDebtLabel: string;
  studentDebtHint: string;
  lvrNote80: string;
  lvrNote90: string;
  assessmentRateHint: string;
  showUkStudentLoanPlan?: boolean;
  showOsfiNote?: boolean;
}> = {
  AU: {
    assessmentRate: 9.5,
    studentDebtTreatment: 'income_based',
    studentDebtLabel: 'HECS/HELP debt (total)',
    studentDebtHint: 'Your current HECS or HELP student loan balance',
    lvrNote80: 'At 80% LVR (no LMI)',
    lvrNote90: 'At 90% LVR (LMI applies)',
    assessmentRateHint: 'APRA requires lenders to assess at your rate + 3% buffer. Default is 9.5%.',
  },
  US: {
    assessmentRate: 9.0,
    studentDebtTreatment: 'monthly_payment',
    studentDebtLabel: 'Student loans (monthly payment)',
    studentDebtHint: 'Your total monthly student loan payments',
    lvrNote80: 'At 80% LTV (no PMI)',
    lvrNote90: 'At 90% LTV (PMI applies)',
    assessmentRateHint: 'Lenders typically qualify you at your contract rate plus a 2% buffer.',
  },
  UK: {
    assessmentRate: 7.5,
    studentDebtTreatment: 'uk_plan',
    studentDebtLabel: 'Student loan',
    studentDebtHint: 'UK student loan repayments are automatically deducted above income thresholds',
    lvrNote80: 'At 80% LTV',
    lvrNote90: 'At 90% LTV (higher rates likely)',
    assessmentRateHint: 'PRA stress test requires lenders to assess at your rate + 3%.',
    showUkStudentLoanPlan: true,
  },
  CA: {
    assessmentRate: 7.25,
    studentDebtTreatment: 'monthly_payment',
    studentDebtLabel: 'Student loans (monthly payment)',
    studentDebtHint: 'Your total monthly student loan payments',
    lvrNote80: 'At 80% LTV (no CMHC)',
    lvrNote90: 'At 95% LTV (CMHC required)',
    assessmentRateHint: 'OSFI B-20 stress test: qualifying rate is the higher of 5.25% or your rate + 2%.',
    showOsfiNote: true,
  },
  NZ: {
    assessmentRate: 9.0,
    studentDebtTreatment: 'income_threshold',
    studentDebtLabel: 'Student loan',
    studentDebtHint: 'Tick if you have a NZ student loan — repayments calculated automatically at 12% above $22,828',
    lvrNote80: 'At 80% LVR (standard rates)',
    lvrNote90: 'At 90% LVR (low equity premium likely)',
    assessmentRateHint: 'NZ lenders typically stress-test at your rate + 2.5%.',
  },
};

const UK_STUDENT_LOAN_PLANS = [
  { id: 'plan1', label: 'Plan 1 (pre-2012 / Northern Ireland)' },
  { id: 'plan2', label: 'Plan 2 (England/Wales from 2012)' },
  { id: 'plan4', label: 'Plan 4 (Scotland)' },
  { id: 'plan5', label: 'Plan 5 (England from 2023)' },
  { id: 'postgrad', label: 'Postgraduate loan' },
];

interface BorrowingPowerInputs extends Record<string, unknown> {
  market: string;
  applicants: number;
  grossIncome1: number;
  grossIncome2: number;
  otherIncome: number;
  monthlyLivingExpenses: number;
  dependants: number;
  creditCardLimits: number;
  existingLoanRepayments: number;
  studentDebt: number | boolean;
  ukStudentLoanPlan: string;
  assessmentRate: number;
}

interface LvrThreshold {
  lvr: number;
  note: string;
  deposit: number;
}

interface BorrowingPowerOutputs extends Record<string, unknown> {
  maxBorrowing: number;
  monthlyRepayment: number;
  depositNeeded: LvrThreshold[];
  depositNeeded80LVR: number;
  depositNeeded90LVR: number;
  netMonthlyIncome: number;
  totalMonthlyCommitments: number;
  availableSurplus: number;
  effectiveAssessmentRate: number;
}

const BorrowingPowerCalculator: React.FC = () => {
  const { country } = useCountry();
  const market = (country || 'AU').toUpperCase();
  const marketDefaults = MARKET_DEFAULTS[market] ?? MARKET_DEFAULTS.AU;

  const DEFAULT_INPUTS: BorrowingPowerInputs = {
    market,
    applicants: 1,
    grossIncome1: 10000000, // $100k in cents
    grossIncome2: 0,
    otherIncome: 0,
    monthlyLivingExpenses: 300000, // $3k in cents
    dependants: 0,
    creditCardLimits: 0,
    existingLoanRepayments: 0,
    studentDebt: 0,
    ukStudentLoanPlan: 'plan2',
    assessmentRate: marketDefaults.assessmentRate,
  };

  const { inputs, outputs, isCalculating, error, setInput, reset } =
    useCalculator<BorrowingPowerInputs, BorrowingPowerOutputs>(
      'borrowing-power',
      DEFAULT_INPUTS
    );
  const { locale, currencySymbol, formatCents: formatDollars } = useMarketCurrency();

  const typedOutputs = outputs as BorrowingPowerOutputs | null;
  const maxBorrowing = typedOutputs?.maxBorrowing ?? 0;
  const capacityPercent = maxBorrowing > 0 ? Math.min(100, (maxBorrowing / 200000000) * 100) : 0;

  // Keep market in sync when country changes
  const currentMarket = inputs.market as string;
  if (currentMarket !== market) {
    setInput('market', market);
    setInput('assessmentRate', marketDefaults.assessmentRate);
  }

  const isUkMarket = market === 'UK';
  const isAuMarket = market === 'AU';
  const isNzMarket = market === 'NZ';
  const isMonthlyStudentDebt = market === 'US' || market === 'CA';
  const isIncomeBasedStudentDebt = isAuMarket || isNzMarket;

  // LVR deposit rows from API output
  const depositRows = useMemo(() => {
    if (!typedOutputs) return null;
    if (typedOutputs.depositNeeded && Array.isArray(typedOutputs.depositNeeded)) {
      return typedOutputs.depositNeeded as LvrThreshold[];
    }
    // Fallback using named fields
    return [
      { lvr: 80, note: marketDefaults.lvrNote80, deposit: typedOutputs.depositNeeded80LVR },
      { lvr: 90, note: marketDefaults.lvrNote90, deposit: typedOutputs.depositNeeded90LVR },
    ];
  }, [typedOutputs, marketDefaults]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Borrowing Power Calculator',
    description:
      'Calculate your maximum borrowing capacity based on your income, expenses, and liabilities.',
    url: 'https://propertyhack.com.au/tools/borrowing-power-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'All',
  };

  return (
    <>
      <Helmet>
        <title>Borrowing Power Calculator | PropertyHack</title>
        <meta
          name="description"
          content="Calculate how much you can borrow for a home loan. Enter your income, expenses and liabilities to get an instant estimate of your borrowing capacity."
        />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://propertyhack.com.au' },
              { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://propertyhack.com.au/tools' },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Borrowing Power Calculator',
                item: 'https://propertyhack.com.au/tools/borrowing-power-calculator',
              },
            ],
          })}
        </script>
      </Helmet>

      <Header />

      <main className="min-h-screen bg-base-200">
        {/* Breadcrumb */}
        <div className="bg-base-100 border-b border-base-300">
          <div className="max-w-6xl mx-auto px-4 py-2">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1.5 text-xs text-content-secondary">
                <li>
                  <Link to="/" className="hover:text-brand-gold transition-colors">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link to="/tools" className="hover:text-brand-gold transition-colors">
                    Tools
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-content" aria-current="page">
                  Borrowing Power Calculator
                </li>
              </ol>
            </nav>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-brand-primary">Borrowing Power Calculator</h1>
            <p className="text-sm text-content-secondary mt-1">
              Estimate how much a lender may let you borrow based on your income, expenses and
              liabilities.
            </p>
          </div>

          {/* CA OSFI B-20 info banner */}
          {marketDefaults.showOsfiNote && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <strong>OSFI B-20 Stress Test:</strong> Canadian lenders must qualify you at the higher of 5.25% or your contract rate + 2%. The assessment rate below reflects this.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* ── Inputs ── */}
            <section
              aria-label="Calculator inputs"
              className="bg-base-100 rounded-xl border border-base-300 p-6 flex flex-col gap-5"
            >
              {/* Applicant toggle */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-content">Number of applicants</span>
                <div className="flex gap-2" role="group" aria-label="Number of applicants">
                  {[1, 2].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setInput('applicants', n)}
                      aria-pressed={inputs.applicants === n}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-1 ${
                        inputs.applicants === n
                          ? 'bg-brand-gold text-brand-primary border-brand-gold'
                          : 'bg-base-200 text-content border-base-300 hover:border-brand-gold'
                      }`}
                    >
                      {n === 1 ? '1 Applicant' : '2 Applicants'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary income */}
              <CurrencyInput
                label="Primary applicant income (annual)"
                value={inputs.grossIncome1}
                onChange={(v) => setInput('grossIncome1', v)}
                hint="Gross annual salary or wages"
                locale={locale}
                currencySymbol={currencySymbol}
              />

              {/* Secondary income — conditional */}
              {inputs.applicants === 2 && (
                <div className="animate-in fade-in duration-200">
                  <CurrencyInput
                    label="Second applicant income (annual)"
                    value={inputs.grossIncome2}
                    onChange={(v) => setInput('grossIncome2', v)}
                    hint="Gross annual salary or wages for second applicant"
                    locale={locale}
                    currencySymbol={currencySymbol}
                  />
                </div>
              )}

              {/* Other income */}
              <CurrencyInput
                label="Other income (annual)"
                value={inputs.otherIncome}
                onChange={(v) => setInput('otherIncome', v)}
                hint="Rental income, dividends, etc."
                locale={locale}
                currencySymbol={currencySymbol}
              />

              {/* Monthly expenses */}
              <CurrencyInput
                label="Monthly living expenses"
                value={inputs.monthlyLivingExpenses}
                onChange={(v) => setInput('monthlyLivingExpenses', v)}
                hint={
                  isAuMarket
                    ? 'Food, utilities, transport, subscriptions, etc. (HEM floor applies)'
                    : 'Food, utilities, transport, subscriptions, etc.'
                }
                locale={locale}
                currencySymbol={currencySymbol}
              />

              {/* Dependants */}
              <div className="flex flex-col gap-1">
                <label htmlFor="dependants" className="text-sm font-medium text-content">
                  Dependants
                </label>
                <select
                  id="dependants"
                  value={inputs.dependants}
                  onChange={(e) => setInput('dependants', Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? 'None' : n === 6 ? '6+' : String(n)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Liabilities */}
              <ExpandableSection title="Liabilities">
                <CurrencyInput
                  label="Credit card limits (total)"
                  value={inputs.creditCardLimits}
                  onChange={(v) => setInput('creditCardLimits', v)}
                  hint="Combined limit across all credit cards (lenders use 3% as monthly commitment)"
                  locale={locale}
                  currencySymbol={currencySymbol}
                />
                <CurrencyInput
                  label="Existing loan repayments (monthly)"
                  value={inputs.existingLoanRepayments}
                  onChange={(v) => setInput('existingLoanRepayments', v)}
                  hint="Car loans, personal loans, existing mortgage repayments"
                  locale={locale}
                  currencySymbol={currencySymbol}
                />

                {/* Student debt — different UI per market */}
                {isAuMarket && (
                  <CurrencyInput
                    label={marketDefaults.studentDebtLabel}
                    value={inputs.studentDebt as number}
                    onChange={(v) => setInput('studentDebt', v)}
                    hint={marketDefaults.studentDebtHint}
                    locale={locale}
                    currencySymbol={currencySymbol}
                  />
                )}

                {isNzMarket && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <input
                        id="nz-student-loan"
                        type="checkbox"
                        checked={Boolean(inputs.studentDebt)}
                        onChange={(e) => setInput('studentDebt', e.target.checked ? 1 : 0)}
                        className="accent-brand-gold w-4 h-4"
                      />
                      <label htmlFor="nz-student-loan" className="text-sm font-medium text-content cursor-pointer">
                        {marketDefaults.studentDebtLabel}
                      </label>
                    </div>
                    {inputs.studentDebt ? (
                      <p className="text-xs text-content-secondary ml-7">{marketDefaults.studentDebtHint}</p>
                    ) : null}
                  </div>
                )}

                {isMonthlyStudentDebt && (
                  <CurrencyInput
                    label={marketDefaults.studentDebtLabel}
                    value={inputs.studentDebt as number}
                    onChange={(v) => setInput('studentDebt', v)}
                    hint={marketDefaults.studentDebtHint}
                    locale={locale}
                    currencySymbol={currencySymbol}
                  />
                )}

                {isUkMarket && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <input
                        id="uk-student-loan"
                        type="checkbox"
                        checked={Boolean(inputs.studentDebt)}
                        onChange={(e) => setInput('studentDebt', e.target.checked ? 1 : 0)}
                        className="accent-brand-gold w-4 h-4"
                      />
                      <label htmlFor="uk-student-loan" className="text-sm font-medium text-content cursor-pointer">
                        {marketDefaults.studentDebtLabel}
                      </label>
                    </div>
                    {Boolean(inputs.studentDebt) && (
                      <div className="ml-7 flex flex-col gap-1">
                        <label htmlFor="uk-plan" className="text-xs font-medium text-content-secondary">
                          Plan type
                        </label>
                        <select
                          id="uk-plan"
                          value={inputs.ukStudentLoanPlan}
                          onChange={(e) => setInput('ukStudentLoanPlan', e.target.value)}
                          className="w-full px-3 py-2 bg-base-200 border border-base-300 rounded-lg text-content text-sm focus:outline-none focus:border-brand-gold transition-colors"
                        >
                          {UK_STUDENT_LOAN_PLANS.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-content-secondary">{marketDefaults.studentDebtHint}</p>
                      </div>
                    )}
                  </div>
                )}
              </ExpandableSection>

              {/* Assessment rate */}
              <PercentageInput
                label="Assessment rate"
                value={inputs.assessmentRate}
                onChange={(v) => setInput('assessmentRate', v)}
                min={1}
                max={20}
                step={0.25}
                hint={marketDefaults.assessmentRateHint}
              />

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2.5 text-sm font-medium text-content border border-base-300 rounded-lg hover:border-brand-gold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-1"
                >
                  Reset
                </button>
                <ShareButton />
              </div>
            </section>

            {/* ── Outputs ── */}
            <section aria-label="Calculator results" aria-live="polite" aria-atomic="true">
              {error && (
                <div
                  role="alert"
                  className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-4">
                {/* Headline */}
                <ResultCard
                  label="Maximum borrowing capacity"
                  value={
                    isCalculating
                      ? 'Calculating…'
                      : typedOutputs
                      ? formatDollars(typedOutputs.maxBorrowing)
                      : '—'
                  }
                  subtitle="Estimated based on your income, expenses and assessment rate"
                />

                {/* Capacity bar */}
                {typedOutputs && maxBorrowing > 0 && (
                  <div className="bg-base-100 border border-base-300 rounded-xl p-5">
                    <p className="text-sm text-content-secondary mb-2">Borrowing capacity</p>
                    <div
                      className="w-full bg-base-200 rounded-full h-4 overflow-hidden"
                      role="meter"
                      aria-valuenow={maxBorrowing}
                      aria-valuemin={0}
                      aria-valuemax={200000000}
                      aria-label={`Borrowing capacity: ${formatDollars(maxBorrowing)}`}
                    >
                      <div
                        className="h-4 rounded-full bg-brand-gold transition-all duration-500"
                        style={{ width: `${capacityPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-xs text-content-secondary">
                      <span>{currencySymbol}0</span>
                      <span>{currencySymbol}2,000,000</span>
                    </div>
                  </div>
                )}

                {/* Supporting results */}
                {typedOutputs && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-base-100 border border-base-300 rounded-xl p-4">
                        <p className="text-xs text-content-secondary mb-0.5">Monthly repayment at max</p>
                        <p className="text-xl font-bold text-brand-primary">
                          {formatDollars(typedOutputs.monthlyRepayment)}
                        </p>
                        <p className="text-xs text-content-secondary mt-0.5">per month</p>
                      </div>
                      <div className="bg-base-100 border border-base-300 rounded-xl p-4">
                        <p className="text-xs text-content-secondary mb-0.5">Available surplus</p>
                        <p className="text-xl font-bold text-brand-primary">
                          {formatDollars(typedOutputs.availableSurplus)}
                        </p>
                        <p className="text-xs text-content-secondary mt-0.5">per month</p>
                      </div>
                    </div>

                    {/* LVR deposit thresholds */}
                    <div className="bg-base-100 border border-base-300 rounded-xl p-5">
                      <p className="text-sm font-medium text-content mb-3">Deposit needed</p>
                      <div className="flex flex-col gap-2.5">
                        {depositRows
                          ? depositRows.map((row) => (
                              <div key={row.lvr} className="flex items-center justify-between">
                                <span className="text-sm text-content-secondary">{row.note}</span>
                                <span className="text-sm font-semibold text-brand-primary">
                                  {formatDollars(row.deposit)}
                                </span>
                              </div>
                            ))
                          : null}
                      </div>
                    </div>

                    {/* CA OSFI qualifying rate note */}
                    {marketDefaults.showOsfiNote && typedOutputs.effectiveAssessmentRate && (
                      <p className="text-xs text-content-secondary">
                        Qualifying rate used: {typedOutputs.effectiveAssessmentRate.toFixed(2)}% (OSFI B-20 minimum)
                      </p>
                    )}
                  </>
                )}

                {/* Save scenario */}
                <div className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3">
                  <SaveScenarioButton
                    calculatorType="borrowing-power"
                    inputs={inputs as unknown as Record<string, unknown>}
                    outputs={typedOutputs as unknown as Record<string, unknown> | null}
                    headlineLabel="Max borrowing"
                    headlineValue={
                      typedOutputs ? formatDollars(typedOutputs.maxBorrowing) : '—'
                    }
                  />
                </div>

                {/* Disclaimer */}
                <p className="text-xs text-content-secondary leading-relaxed">
                  This is an estimate only. Actual borrowing capacity depends on your lender's
                  assessment criteria, credit history, and individual policy. Figures are for
                  guidance only and do not constitute financial advice.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default BorrowingPowerCalculator;
