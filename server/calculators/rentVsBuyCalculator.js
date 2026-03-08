'use strict';

const mortgageCalculator = require('./mortgageCalculator');
const stampDutyCalculator = require('./stampDutyCalculator');

const KEY_YEARS = [5, 10, 15, 20, 25, 30];

function calculate(inputs) {
  const {
    purchasePrice,
    weeklyRent,
    availableDeposit,
    mortgageRate,
    loanTermYears = 30,
    propertyGrowthRate = 5,
    rentIncreaseRate = 3,
    investmentReturnRate = 7,
  } = inputs;

  const loanAmount = purchasePrice - availableDeposit;

  // Get monthly mortgage payment via mortgage calculator
  const mortgageResult = mortgageCalculator.calculate({
    propertyPrice: purchasePrice,
    deposit: availableDeposit,
    loanTermYears,
    interestRate: mortgageRate,
    repaymentType: 'PI',
    frequency: 'monthly',
  });

  const monthlyMortgagePayment = mortgageResult.repaymentAmount;

  // Build an amortisation lookup: remaining balance at end of each year
  // mortgageResult.chartData has { year, balance } for each year
  const balanceByYear = {};
  for (const entry of mortgageResult.chartData) {
    balanceByYear[entry.year] = entry.balance;
  }

  // Stamp duty using NSW standard buyer, established, primary residence defaults
  const stampDutyResult = stampDutyCalculator.calculate({
    propertyPrice: purchasePrice,
    state: 'NSW',
    buyerType: 'standard',
    propertyType: 'established',
    primaryResidence: true,
  });

  const stampDuty = stampDutyResult.stampDuty;
  const legalFees = 200000;
  const inspectionFees = 50000;
  const totalBuyingCosts = stampDuty + legalFees + inspectionFees;

  // Renter starts with deposit + buying costs (money not spent on buying)
  const renterStartingCapital = availableDeposit + totalBuyingCosts;

  const monthlyInvestmentRate = investmentReturnRate / 100 / 12;
  const monthlyGrowthRate = propertyGrowthRate / 100 / 12;

  const chartData = [];
  const yearlyBreakdown = [];
  const snapshots = [];

  let breakEvenYear = null;

  // Year-by-year simulation
  // We track the renter's portfolio month-by-month for accuracy but record yearly snapshots
  let renterPortfolio = renterStartingCapital;

  for (let year = 1; year <= loanTermYears; year++) {
    // Property value at end of this year (compound annually)
    const propertyValue = Math.round(purchasePrice * Math.pow(1 + propertyGrowthRate / 100, year));

    // Remaining loan balance at end of this year
    const loanBalance = balanceByYear[year] !== undefined ? balanceByYear[year] : 0;

    // Buy net position: equity minus all buying costs (costs only deducted conceptually at year 0)
    const buyNetPosition = propertyValue - loanBalance - totalBuyingCosts;

    // Annual rent at start of this year (increases each year)
    // Year 1 = original rent, year 2 = rent * (1 + rate), etc.
    const annualRent = Math.round(weeklyRent * 52 * Math.pow(1 + rentIncreaseRate / 100, year - 1));
    const monthlyRent = Math.round(annualRent / 12);

    // Renter's monthly savings = mortgage payment - current monthly rent (invest if positive)
    const monthlySavings = monthlyMortgagePayment - monthlyRent;

    // Simulate 12 months of portfolio growth + contributions for this year
    for (let month = 1; month <= 12; month++) {
      // Portfolio compounds monthly
      renterPortfolio = Math.round(renterPortfolio * (1 + monthlyInvestmentRate));
      // Renter invests the mortgage-rent difference if positive
      if (monthlySavings > 0) {
        renterPortfolio += monthlySavings;
      }
      // If rent > mortgage (later years), buyer has more cashflow — but we don't penalise renter;
      // the renter simply doesn't invest (negative monthlySavings means renter pays more than buyer)
      // In that case renter is spending more, so we leave portfolio as-is (no withdrawal modelled)
    }

    const rentNetPosition = renterPortfolio;

    // Detect first breakeven
    if (breakEvenYear === null && buyNetPosition > rentNetPosition) {
      breakEvenYear = year;
    }

    chartData.push({ year, buyWealth: buyNetPosition, rentWealth: rentNetPosition });

    yearlyBreakdown.push({
      year,
      propertyValue,
      loanBalance,
      buyEquity: propertyValue - loanBalance,
      annualRent,
      monthlyRent,
      investmentValue: rentNetPosition,
      monthlySavings,
    });

    if (KEY_YEARS.includes(year) || year === loanTermYears) {
      snapshots.push({
        year,
        buyNetPosition,
        rentNetPosition,
        propertyValue,
        loanBalance,
        investmentValue: rentNetPosition,
        annualRent,
      });
    }
  }

  // Deduplicate snapshots (loanTermYears might already be in KEY_YEARS)
  const seen = new Set();
  const uniqueSnapshots = snapshots.filter((s) => {
    if (seen.has(s.year)) return false;
    seen.add(s.year);
    return true;
  });

  const lastPoint = chartData[chartData.length - 1];
  let summaryStatement;
  if (breakEvenYear !== null) {
    summaryStatement = `Based on these inputs, buying becomes more advantageous after ${breakEvenYear} year${breakEvenYear === 1 ? '' : 's'}. At the end of ${loanTermYears} years, buying leaves you $${formatDollars(lastPoint.buyWealth)} ahead vs $${formatDollars(lastPoint.rentWealth)} from renting and investing.`;
  } else {
    summaryStatement = `Based on these inputs, renting and investing the difference is more advantageous over the full ${loanTermYears}-year term. At year ${loanTermYears}, renting and investing leaves you $${formatDollars(lastPoint.rentWealth)} ahead vs $${formatDollars(lastPoint.buyWealth)} from buying.`;
  }

  return {
    breakEvenYear,
    summaryStatement,
    monthlyMortgagePayment,
    stampDuty,
    totalBuyingCosts,
    snapshots: uniqueSnapshots,
    chartData,
    yearlyBreakdown,
  };
}

function formatDollars(cents) {
  return Math.round(Math.abs(cents) / 100).toLocaleString('en-AU');
}

module.exports = { calculate };
