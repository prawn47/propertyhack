'use strict';

const mortgageCalculator = require('./mortgageCalculator');
const stampDutyCalculator = require('./stampDutyCalculator');
const marketDefaults = require('../config/calculators/marketDefaults.json');

const KEY_YEARS = [5, 10, 15, 20, 25, 30];

// US marginal tax brackets for 2024 (single filer) — used for mortgage interest + property tax deduction
const US_TAX_BRACKETS = [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];

function calculate(inputs) {
  const {
    purchasePrice,
    weeklyRent,
    monthlyRent,
    availableDeposit,
    mortgageRate,
    loanTermYears = 30,
    propertyGrowthRate,
    rentIncreaseRate,
    investmentReturnRate,
    market = 'AU',
    // US-specific
    propertyTaxRate,
    useTaxDeduction = false,
    marginalTaxBracket,
  } = inputs;

  const mkt = market.toUpperCase();
  const defaults = marketDefaults.rentVsBuy[mkt] || marketDefaults.rentVsBuy['AU'];

  const growthRate = propertyGrowthRate !== undefined ? propertyGrowthRate : defaults.propertyGrowthRate;
  const rentIncrease = rentIncreaseRate !== undefined ? rentIncreaseRate : defaults.rentIncreaseRate;
  const investmentReturn = investmentReturnRate !== undefined ? investmentReturnRate : defaults.investmentReturnRate;

  // Normalise rent to monthly cents (front-end sends weekly for AU/NZ, monthly for US/UK/CA)
  let monthlyRentCents;
  if (mkt === 'AU' || mkt === 'NZ') {
    // weeklyRent field used
    monthlyRentCents = Math.round((weeklyRent || 0) * 52 / 12);
  } else {
    // monthlyRent field used (front-end maps it to weeklyRent key for backwards compat, or sends monthlyRent)
    monthlyRentCents = monthlyRent || weeklyRent || 0;
  }

  const loanAmount = purchasePrice - availableDeposit;

  const mortgageResult = mortgageCalculator.calculate({
    propertyPrice: purchasePrice,
    deposit: availableDeposit,
    loanTermYears,
    interestRate: mortgageRate,
    repaymentType: 'PI',
    frequency: 'monthly',
  });

  const monthlyMortgagePayment = mortgageResult.repaymentAmount;

  const balanceByYear = {};
  for (const entry of mortgageResult.chartData) {
    balanceByYear[entry.year] = entry.balance;
  }

  // --- Buying costs per market ---
  const buyingCostConfig = defaults.buyingCosts;
  let stampDuty = 0;

  if (buyingCostConfig.includeStampDuty) {
    const stampDutyResult = stampDutyCalculator.calculate({
      propertyPrice: purchasePrice,
      state: buyingCostConfig.stampDutyState || 'NSW',
      buyerType: 'standard',
      propertyType: 'established',
      primaryResidence: true,
    });
    stampDuty = stampDutyResult.stampDuty;
  }

  const legalFees = buyingCostConfig.legalFees || 200000;
  const inspectionFees = buyingCostConfig.inspectionFees || 50000;
  const totalBuyingCosts = stampDuty + legalFees + inspectionFees;

  // --- US property tax ---
  // propertyTaxRate is percentage per year (e.g. 1.1 means 1.1% of property value)
  const usPropertyTaxRate = mkt === 'US'
    ? (propertyTaxRate !== undefined ? propertyTaxRate : (buyingCostConfig.defaultPropertyTaxRate || 1.1))
    : 0;

  // --- US mortgage interest deduction benefit ---
  // Annual benefit = (annual mortgage interest + annual property tax) * marginal bracket
  // We approximate annual interest as average over the loan term for simplicity.
  // More accurately, we compute it year-by-year in the simulation loop.
  const taxBracket = useTaxDeduction && mkt === 'US' && marginalTaxBracket
    ? Math.min(Math.max(marginalTaxBracket / 100, 0), 0.37)
    : 0;

  const renterStartingCapital = availableDeposit + totalBuyingCosts;

  const monthlyInvestmentRate = investmentReturn / 100 / 12;

  const chartData = [];
  const yearlyBreakdown = [];
  const snapshots = [];

  let breakEvenYear = null;
  let renterPortfolio = renterStartingCapital;

  for (let year = 1; year <= loanTermYears; year++) {
    const propertyValue = Math.round(purchasePrice * Math.pow(1 + growthRate / 100, year));
    const loanBalance = balanceByYear[year] !== undefined ? balanceByYear[year] : 0;

    // US property tax: grows with property value each year
    const annualPropertyTax = mkt === 'US'
      ? Math.round(propertyValue * usPropertyTaxRate / 100)
      : 0;
    const monthlyPropertyTax = Math.round(annualPropertyTax / 12);

    // US tax deduction: estimate annual mortgage interest from balance
    const prevBalance = balanceByYear[year - 1] !== undefined ? balanceByYear[year - 1] : loanAmount;
    const annualInterestEstimate = Math.round(prevBalance * mortgageRate / 100);
    const annualTaxDeductionBenefit = taxBracket > 0
      ? Math.round((annualInterestEstimate + annualPropertyTax) * taxBracket)
      : 0;
    const monthlyTaxDeductionBenefit = Math.round(annualTaxDeductionBenefit / 12);

    // Total monthly buying cost = mortgage + property tax - tax deduction benefit
    const monthlyBuyingCost = monthlyMortgagePayment + monthlyPropertyTax - monthlyTaxDeductionBenefit;

    // Annual rent at start of this year
    const annualRentYear = Math.round(monthlyRentCents * 12 * Math.pow(1 + rentIncrease / 100, year - 1));
    const monthlyRentYear = Math.round(annualRentYear / 12);

    const monthlySavings = monthlyBuyingCost - monthlyRentYear;

    for (let month = 1; month <= 12; month++) {
      renterPortfolio = Math.round(renterPortfolio * (1 + monthlyInvestmentRate));
      if (monthlySavings > 0) {
        renterPortfolio += monthlySavings;
      }
    }

    const buyNetPosition = propertyValue - loanBalance - totalBuyingCosts;
    const rentNetPosition = renterPortfolio;

    if (breakEvenYear === null && buyNetPosition > rentNetPosition) {
      breakEvenYear = year;
    }

    chartData.push({ year, buyWealth: buyNetPosition, rentWealth: rentNetPosition });

    yearlyBreakdown.push({
      year,
      propertyValue,
      loanBalance,
      buyEquity: propertyValue - loanBalance,
      annualRent: annualRentYear,
      monthlyRent: monthlyRentYear,
      investmentValue: rentNetPosition,
      monthlySavings,
      annualPropertyTax,
      annualTaxDeductionBenefit,
    });

    if (KEY_YEARS.includes(year) || year === loanTermYears) {
      snapshots.push({
        year,
        buyNetPosition,
        rentNetPosition,
        propertyValue,
        loanBalance,
        investmentValue: rentNetPosition,
        annualRent: annualRentYear,
      });
    }
  }

  const seen = new Set();
  const uniqueSnapshots = snapshots.filter((s) => {
    if (seen.has(s.year)) return false;
    seen.add(s.year);
    return true;
  });

  const lastPoint = chartData[chartData.length - 1];
  let summaryStatement;
  if (breakEvenYear !== null) {
    summaryStatement = `Based on these inputs, buying becomes more advantageous after ${breakEvenYear} year${breakEvenYear === 1 ? '' : 's'}. At the end of ${loanTermYears} years, buying leaves you ${formatDollars(lastPoint.buyWealth)} ahead vs ${formatDollars(lastPoint.rentWealth)} from renting and investing.`;
  } else {
    summaryStatement = `Based on these inputs, renting and investing the difference is more advantageous over the full ${loanTermYears}-year term. At year ${loanTermYears}, renting and investing leaves you ${formatDollars(lastPoint.rentWealth)} ahead vs ${formatDollars(lastPoint.buyWealth)} from buying.`;
  }

  return {
    breakEvenYear,
    summaryStatement,
    monthlyMortgagePayment,
    stampDuty,
    totalBuyingCosts,
    market: mkt,
    snapshots: uniqueSnapshots,
    chartData,
    yearlyBreakdown,
  };
}

function formatDollars(cents) {
  const dollars = Math.round(Math.abs(cents) / 100);
  if (dollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(2)}M`;
  }
  return `$${dollars.toLocaleString()}`;
}

module.exports = { calculate };
