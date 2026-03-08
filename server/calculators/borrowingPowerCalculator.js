'use strict';

const path = require('path');
const hemTable = require(path.join(__dirname, '../config/calculators/hemTable.json'));
const hecsData = require(path.join(__dirname, '../config/calculators/hecsThresholds.json'));

// ATO 2024-25 individual income tax brackets (resident)
// Thresholds in dollars, rates are marginal
const TAX_BRACKETS = [
  { min: 0,       max: 18200,  base: 0,      rate: 0 },
  { min: 18201,   max: 45000,  base: 0,      rate: 0.19 },
  { min: 45001,   max: 120000, base: 5092,   rate: 0.325 },
  { min: 120001,  max: 180000, base: 29467,  rate: 0.37 },
  { min: 180001,  max: null,   base: 51667,  rate: 0.45 },
];

// Medicare levy: 2% of taxable income (simplified — no low-income reduction)
const MEDICARE_LEVY_RATE = 0.02;

// Low Income Tax Offset (LITO) — reduces tax payable
function calcLito(grossAnnualDollars) {
  if (grossAnnualDollars <= 37500) return 700;
  if (grossAnnualDollars <= 45000) return 700 - (grossAnnualDollars - 37500) * 0.05;
  if (grossAnnualDollars <= 66667) return 150 - (grossAnnualDollars - 45000) * 0.015;
  return 0;
}

// Estimate annual tax in cents given gross annual income in cents
function estimateTax(grossAnnualCents) {
  const income = grossAnnualCents / 100; // convert to dollars for bracket lookup
  let tax = 0;

  for (const bracket of TAX_BRACKETS) {
    if (income <= bracket.min) break;
    const taxableInBracket = Math.min(income, bracket.max || Infinity) - bracket.min;
    tax = bracket.base + taxableInBracket * bracket.rate;
    if (bracket.max === null || income <= bracket.max) break;
  }

  // Apply LITO (offsets reduce tax, not below zero)
  const litoOffset = calcLito(income);
  tax = Math.max(0, tax - litoOffset);

  // Medicare levy
  const medicare = income * MEDICARE_LEVY_RATE;
  const totalTaxDollars = tax + medicare;

  return Math.round(totalTaxDollars * 100); // return cents
}

// Determine HEM income bracket key
function hemIncomeBracket(grossAnnualCents) {
  const dollars = grossAnnualCents / 100;
  if (dollars < 50000) return 'low';
  if (dollars <= 100000) return 'medium';
  return 'high';
}

// Look up HEM monthly floor in cents
function lookupHem(applicants, dependants, grossAnnualCents) {
  const type = applicants >= 2 ? 'couple' : 'single';
  const depKey = dependants >= 4 ? '4+' : String(Math.min(dependants, 4));
  const bracketKey = hemIncomeBracket(grossAnnualCents);
  return hemTable[type][depKey][bracketKey];
}

// Calculate monthly HECS repayment in cents given gross income in cents and debt balance in cents
function calcHecsMonthlyRepayment(grossAnnualCents, hecsDebtCents) {
  if (hecsDebtCents <= 0) return 0;

  const grossAnnualDollars = grossAnnualCents / 100;
  let repaymentRate = 0;

  for (const threshold of hecsData.thresholds) {
    if (grossAnnualDollars >= threshold.min && (threshold.max === null || grossAnnualDollars <= threshold.max)) {
      repaymentRate = threshold.rate;
      break;
    }
  }

  if (repaymentRate === 0) return 0;

  // Annual HECS repayment = rate × gross income (ATO applies to whole income)
  const annualRepaymentCents = Math.round(grossAnnualCents * repaymentRate);

  // Cap repayment at actual debt balance
  const cappedAnnualCents = Math.min(annualRepaymentCents, hecsDebtCents);

  return Math.round(cappedAnnualCents / 12);
}

// Invert P&I formula: given monthly repayment M, rate r (annual %), term n (months),
// return max loan principal in cents
// Formula: P = M × [(1+r)^n - 1] / [r × (1+r)^n]
function maxLoanFromRepayment(monthlyRepaymentCents, annualRatePercent, termMonths) {
  if (monthlyRepaymentCents <= 0) return 0;

  const r = annualRatePercent / 100 / 12;
  if (r === 0) {
    return Math.round(monthlyRepaymentCents * termMonths);
  }

  const onePlusRtoN = Math.pow(1 + r, termMonths);
  const principal = monthlyRepaymentCents * (onePlusRtoN - 1) / (r * onePlusRtoN);
  return Math.round(principal);
}

/**
 * Calculate borrowing power.
 *
 * @param {Object} inputs
 * @param {number} inputs.applicants              - 1 or 2
 * @param {number} inputs.grossIncome1            - cents/year
 * @param {number} inputs.grossIncome2            - cents/year (0 if single)
 * @param {number} inputs.otherIncome             - cents/year
 * @param {number} inputs.monthlyLivingExpenses   - cents/month
 * @param {number} inputs.creditCardLimits        - cents (total)
 * @param {number} inputs.existingLoanRepayments  - cents/month
 * @param {number} inputs.hecsDebt                - cents (total balance)
 * @param {number} inputs.dependants              - 0-6
 * @param {number} inputs.assessmentRate          - percentage (default 9.5)
 *
 * @returns {Object}
 */
function calculate(inputs) {
  const {
    applicants = 1,
    grossIncome1 = 0,
    grossIncome2 = 0,
    otherIncome = 0,
    monthlyLivingExpenses = 0,
    creditCardLimits = 0,
    existingLoanRepayments = 0,
    hecsDebt = 0,
    dependants = 0,
    assessmentRate = 9.5,
  } = inputs;

  const TERM_MONTHS = 360; // 30 years

  // a. Total gross annual income
  const totalGrossIncome = grossIncome1 + grossIncome2 + otherIncome;

  // b. Net monthly income (estimate tax on combined income)
  const annualTax = estimateTax(totalGrossIncome);
  const netAnnualIncome = totalGrossIncome - annualTax;
  const netMonthlyIncome = Math.round(netAnnualIncome / 12);

  // c. HEM floor — use combined gross income for bracket lookup
  const hemMonthly = lookupHem(applicants, dependants, totalGrossIncome);
  const hemApplied = monthlyLivingExpenses < hemMonthly;
  const effectiveExpenses = hemApplied ? hemMonthly : monthlyLivingExpenses;

  // d. HECS monthly repayment — based on combined gross income
  const hecsMonthlyRepayment = calcHecsMonthlyRepayment(totalGrossIncome, hecsDebt);

  // e. Credit card commitment: 3% of total limits per month
  const creditCardCommitment = Math.round(creditCardLimits * 0.03);

  // f. Total monthly commitments
  const totalMonthlyCommitments =
    effectiveExpenses + existingLoanRepayments + hecsMonthlyRepayment + creditCardCommitment;

  // g. Available monthly surplus
  const availableSurplus = netMonthlyIncome - totalMonthlyCommitments;

  // h. Max borrowing: invert P&I formula at assessment rate over 30 years
  let maxBorrowing = 0;
  if (availableSurplus > 0) {
    maxBorrowing = maxLoanFromRepayment(availableSurplus, assessmentRate, TERM_MONTHS);
  }

  // Monthly repayment at assessment rate on max borrowing (confirms the inversion)
  let monthlyRepayment = 0;
  if (maxBorrowing > 0) {
    const r = assessmentRate / 100 / 12;
    const onePlusRtoN = Math.pow(1 + r, TERM_MONTHS);
    monthlyRepayment = Math.round(maxBorrowing * (r * onePlusRtoN) / (onePlusRtoN - 1));
  }

  // i. Deposit needed at 80% LVR: property = maxBorrowing / 0.8, deposit = property × 0.2
  const depositNeeded80LVR = maxBorrowing > 0 ? Math.round(maxBorrowing / 0.8 * 0.2) : 0;

  // j. Deposit needed at 90% LVR: property = maxBorrowing / 0.9, deposit = property × 0.1
  const depositNeeded90LVR = maxBorrowing > 0 ? Math.round(maxBorrowing / 0.9 * 0.1) : 0;

  return {
    maxBorrowing,
    monthlyRepayment,
    depositNeeded80LVR,
    depositNeeded90LVR,
    netMonthlyIncome,
    totalMonthlyCommitments,
    availableSurplus,
    hemApplied,
    hecsMonthlyRepayment,
    creditCardCommitment,
  };
}

module.exports = { calculate };
