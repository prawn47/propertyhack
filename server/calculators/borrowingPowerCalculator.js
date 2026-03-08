'use strict';

const path = require('path');

// Cache loaded market configs to avoid repeated file I/O
const configCache = {};

function loadMarketConfig(market) {
  const key = market.toUpperCase();
  if (!configCache[key]) {
    configCache[key] = require(
      path.join(__dirname, `../config/calculators/borrowingPower/${key.toLowerCase()}.json`)
    );
  }
  return configCache[key];
}

// Generic bracket-based income tax calculator
// Works for AU, UK, US, CA, NZ — all use the same bracket structure
function calcIncomeTax(grossAnnualDollars, brackets) {
  let tax = 0;
  for (const bracket of brackets) {
    if (grossAnnualDollars <= bracket.min) break;
    const taxableInBracket = Math.min(grossAnnualDollars, bracket.max || Infinity) - bracket.min;
    tax = bracket.base + taxableInBracket * bracket.rate;
    if (bracket.max === null || grossAnnualDollars <= bracket.max) break;
  }
  return tax;
}

// AU-specific: Low Income Tax Offset from config tiers
function calcLitoFromConfig(grossAnnualDollars, litoConfig) {
  if (!litoConfig || !litoConfig.enabled) return 0;
  for (const tier of litoConfig.tiers) {
    if (tier.maxIncome === null || grossAnnualDollars <= tier.maxIncome) {
      if (tier.taperRate === 0) return tier.offset;
      return Math.max(0, tier.offset - (grossAnnualDollars - tier.taperFrom) * tier.taperRate);
    }
  }
  return 0;
}

// Estimate total annual tax (income tax + levies) in dollars for a given market
function estimateTotalTax(grossAnnualDollars, marketConfig) {
  const taxCfg = marketConfig.incomeTax;
  let adjustedIncome = grossAnnualDollars;

  // US: subtract standard deduction before applying brackets
  if (taxCfg.standardDeduction) {
    adjustedIncome = Math.max(0, grossAnnualDollars - taxCfg.standardDeduction);
  }

  // CA: subtract basic personal amount
  if (taxCfg.basicPersonalAmount) {
    adjustedIncome = Math.max(0, grossAnnualDollars - taxCfg.basicPersonalAmount);
  }

  let tax = calcIncomeTax(adjustedIncome, taxCfg.brackets);

  // AU: apply LITO offset
  if (taxCfg.lito) {
    tax = Math.max(0, tax - calcLitoFromConfig(grossAnnualDollars, taxCfg.lito));
  }

  // AU: Medicare levy
  if (taxCfg.medicareLevy) {
    tax += grossAnnualDollars * taxCfg.medicareLevy;
  }

  // UK: National Insurance contributions
  if (taxCfg.nationalInsurance) {
    const ni = taxCfg.nationalInsurance;
    const niable = Math.max(0, grossAnnualDollars - ni.primaryThreshold);
    const belowUEL = Math.max(0, Math.min(niable, ni.upperEarningsLimit - ni.primaryThreshold));
    const aboveUEL = Math.max(0, niable - (ni.upperEarningsLimit - ni.primaryThreshold));
    tax += belowUEL * ni.rateBelowUEL + aboveUEL * ni.rateAboveUEL;
  }

  // US: FICA (Social Security + Medicare)
  if (taxCfg.ficaRate) {
    const ficaBase = Math.min(grossAnnualDollars, taxCfg.ficaWageBase || Infinity);
    tax += ficaBase * taxCfg.ficaRate;
    // Additional Medicare for high earners
    if (taxCfg.medicareAdditional && taxCfg.medicareAdditionalThreshold) {
      const extra = Math.max(0, grossAnnualDollars - taxCfg.medicareAdditionalThreshold);
      tax += extra * taxCfg.medicareAdditional;
    }
  }

  // CA: CPP contributions
  if (taxCfg.cppContribution) {
    const cpp = taxCfg.cppContribution;
    const cppEarnings = Math.min(
      Math.max(0, grossAnnualDollars - cpp.exemption),
      cpp.maxPensionableEarnings - cpp.exemption
    );
    tax += cppEarnings * cpp.rate;
  }

  // CA: EI premiums
  if (taxCfg.eiPremium) {
    const ei = taxCfg.eiPremium;
    const eiEarnings = Math.min(grossAnnualDollars, ei.maxInsurableEarnings);
    tax += eiEarnings * ei.rate;
  }

  // NZ: ACC earners' levy
  if (taxCfg.accLevy) {
    const acc = taxCfg.accLevy;
    const accEarnings = Math.min(grossAnnualDollars, acc.maxEarnings || Infinity);
    tax += accEarnings * acc.rate;
  }

  return tax;
}

// AU HEM table lookup (only used for AU)
let hemTable = null;
function getHemTable() {
  if (!hemTable) {
    hemTable = require(path.join(__dirname, '../config/calculators/hemTable.json'));
  }
  return hemTable;
}

function hemIncomeBracket(grossAnnualDollars) {
  if (grossAnnualDollars < 50000) return 'low';
  if (grossAnnualDollars <= 100000) return 'medium';
  return 'high';
}

function lookupHem(applicants, dependants, grossAnnualDollars) {
  const table = getHemTable();
  const type = applicants >= 2 ? 'couple' : 'single';
  const depKey = dependants >= 4 ? '4+' : String(Math.min(dependants, 4));
  const bracketKey = hemIncomeBracket(grossAnnualDollars);
  return table[type][depKey][bracketKey]; // cents/month
}

// AU/NZ: income-based student debt repayment using threshold tables
function calcIncomeBasedStudentDebt(grossAnnualDollars, debtBalanceCents, studentDebtCfg) {
  if (!debtBalanceCents || debtBalanceCents <= 0) return 0;

  let repaymentRate = 0;

  if (studentDebtCfg.thresholds) {
    // AU style: percentage-based rate table
    for (const threshold of studentDebtCfg.thresholds) {
      if (
        grossAnnualDollars >= threshold.min &&
        (threshold.max === null || grossAnnualDollars <= threshold.max)
      ) {
        repaymentRate = threshold.rate;
        break;
      }
    }
  } else if (studentDebtCfg.threshold !== undefined && studentDebtCfg.rate !== undefined) {
    // NZ style: flat rate above single threshold
    if (grossAnnualDollars > studentDebtCfg.threshold) {
      repaymentRate = studentDebtCfg.rate;
      // NZ: repayment is rate * (income - threshold), not rate * income
      const excess = grossAnnualDollars - studentDebtCfg.threshold;
      const annualRepaymentCents = Math.round(excess * repaymentRate * 100);
      const cappedCents = Math.min(annualRepaymentCents, debtBalanceCents);
      return Math.round(cappedCents / 12);
    }
    return 0;
  }

  if (repaymentRate === 0) return 0;
  const annualRepaymentCents = Math.round(grossAnnualDollars * 100 * repaymentRate);
  const cappedCents = Math.min(annualRepaymentCents, debtBalanceCents);
  return Math.round(cappedCents / 12);
}

// UK: income-threshold-based student debt by plan
function calcUkStudentDebt(grossAnnualDollars, hasStudentLoan, studentDebtCfg, planId) {
  if (!hasStudentLoan) return 0;
  const plans = studentDebtCfg.plans || [];
  const plan = plans.find((p) => p.id === planId) || plans.find((p) => p.id === 'plan2');
  if (!plan) return 0;
  const excess = Math.max(0, grossAnnualDollars - plan.threshold);
  const annualRepaymentDollars = excess * plan.rate;
  return Math.round((annualRepaymentDollars / 12) * 100); // cents/month
}

// Invert P&I formula: given monthly repayment M, rate r (annual %), term n (months),
// return max loan principal in cents
function maxLoanFromRepayment(monthlyRepaymentCents, annualRatePercent, termMonths) {
  if (monthlyRepaymentCents <= 0) return 0;
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return Math.round(monthlyRepaymentCents * termMonths);
  const onePlusRtoN = Math.pow(1 + r, termMonths);
  return Math.round(monthlyRepaymentCents * (onePlusRtoN - 1) / (r * onePlusRtoN));
}

/**
 * Calculate borrowing power for a given market.
 *
 * @param {Object} inputs
 * @param {string} inputs.market                  - 'AU' | 'US' | 'UK' | 'CA' | 'NZ' (default 'AU')
 * @param {number} inputs.applicants              - 1 or 2
 * @param {number} inputs.grossIncome1            - cents/year
 * @param {number} inputs.grossIncome2            - cents/year (0 if single)
 * @param {number} inputs.otherIncome             - cents/year
 * @param {number} inputs.monthlyLivingExpenses   - cents/month
 * @param {number} inputs.creditCardLimits        - cents (total)
 * @param {number} inputs.existingLoanRepayments  - cents/month
 * @param {number|boolean} inputs.studentDebt     - cents (AU/NZ total balance) OR monthly cents (US/CA) OR boolean (UK checkbox)
 * @param {string} inputs.ukStudentLoanPlan       - UK plan id: 'plan1'|'plan2'|'plan4'|'plan5'|'postgrad'
 * @param {number} inputs.hecsDebt                - cents (AU backward compat alias for studentDebt)
 * @param {number} inputs.dependants              - 0-6
 * @param {number} inputs.assessmentRate          - percentage
 *
 * @returns {Object}
 */
function calculate(inputs) {
  const market = (inputs.market || 'AU').toUpperCase();
  const marketConfig = loadMarketConfig(market);

  const {
    applicants = 1,
    grossIncome1 = 0,
    grossIncome2 = 0,
    otherIncome = 0,
    monthlyLivingExpenses = 0,
    creditCardLimits = 0,
    existingLoanRepayments = 0,
    dependants = 0,
    ukStudentLoanPlan = 'plan2',
  } = inputs;

  // Normalize assessmentRate: use provided or market default
  const assessmentRate = inputs.assessmentRate != null
    ? inputs.assessmentRate
    : marketConfig.defaultAssessmentRate;

  // CA OSFI B-20 stress test: qualifying rate = max(5.25%, contractRate + 2%)
  // When assessmentRate isn't explicitly overridden by the user, the default already
  // bakes this in (7.25%). If the user supplies their own contract rate, enforce the floor.
  let effectiveAssessmentRate = assessmentRate;
  if (market === 'CA' && marketConfig.osfiB20StressTest?.enabled) {
    const { minimumQualifyingRate } = marketConfig.osfiB20StressTest;
    // If user provides a rate lower than the OSFI floor, enforce the floor
    if (assessmentRate < minimumQualifyingRate) {
      effectiveAssessmentRate = minimumQualifyingRate;
    }
  }

  const TERM_MONTHS = marketConfig.termMonths || 360;

  // Resolve studentDebt field (backward compat: hecsDebt for AU)
  let studentDebt = inputs.studentDebt;
  if (studentDebt === undefined && inputs.hecsDebt !== undefined) {
    studentDebt = inputs.hecsDebt;
  }

  // a. Total gross annual income in dollars (for tax/levy calculations)
  const totalGrossIncomeCents = grossIncome1 + grossIncome2 + otherIncome;
  const totalGrossIncomeDollars = totalGrossIncomeCents / 100;

  // b. Estimate tax on combined income for all markets
  const annualTaxDollars = estimateTotalTax(totalGrossIncomeDollars, marketConfig);
  const netAnnualIncomeCents = Math.round((totalGrossIncomeDollars - annualTaxDollars) * 100);
  const netMonthlyIncome = Math.round(netAnnualIncomeCents / 12);

  // c. Living expenses benchmark
  // AU only: HEM floor. All other markets use declared expenses directly.
  let effectiveExpenses = monthlyLivingExpenses;
  let hemApplied = false;
  if (marketConfig.useHEM) {
    const hemMonthly = lookupHem(applicants, dependants, totalGrossIncomeDollars);
    hemApplied = monthlyLivingExpenses < hemMonthly;
    effectiveExpenses = hemApplied ? hemMonthly : monthlyLivingExpenses;
  }

  // d. Student debt monthly commitment
  let studentDebtMonthly = 0;
  const studentDebtTreatment = marketConfig.studentDebtTreatment;

  if (studentDebtTreatment === 'income_based') {
    // AU: income-based threshold table
    studentDebtMonthly = calcIncomeBasedStudentDebt(
      totalGrossIncomeDollars,
      studentDebt || 0,
      marketConfig.studentDebt
    );
  } else if (studentDebtTreatment === 'income_threshold') {
    // NZ: flat rate above single threshold (studentDebt is balance in cents)
    studentDebtMonthly = calcIncomeBasedStudentDebt(
      totalGrossIncomeDollars,
      studentDebt || 0,
      marketConfig.studentDebt
    );
  } else if (studentDebtTreatment === 'monthly_payment') {
    // US/CA: declared monthly payment in cents
    studentDebtMonthly = studentDebt || 0;
  } else if (studentDebtTreatment === 'uk_plan') {
    // UK: income-threshold plan-based deduction (studentDebt is boolean or truthy)
    studentDebtMonthly = calcUkStudentDebt(
      totalGrossIncomeDollars,
      Boolean(studentDebt),
      marketConfig.studentDebt,
      ukStudentLoanPlan
    );
  }

  // e. Credit card commitment: 3% of total limits per month (universal)
  const creditCardCommitment = Math.round(creditCardLimits * 0.03);

  // f. Total monthly commitments
  const totalMonthlyCommitments =
    effectiveExpenses + existingLoanRepayments + studentDebtMonthly + creditCardCommitment;

  // g. Available monthly surplus
  const availableSurplus = netMonthlyIncome - totalMonthlyCommitments;

  // h. Max borrowing: invert P&I formula at effective assessment rate
  let maxBorrowing = 0;
  if (availableSurplus > 0) {
    maxBorrowing = maxLoanFromRepayment(availableSurplus, effectiveAssessmentRate, TERM_MONTHS);
  }

  // Monthly repayment at assessment rate on max borrowing (confirms the inversion)
  let monthlyRepayment = 0;
  if (maxBorrowing > 0) {
    const r = effectiveAssessmentRate / 100 / 12;
    const onePlusRtoN = Math.pow(1 + r, TERM_MONTHS);
    monthlyRepayment = Math.round(maxBorrowing * (r * onePlusRtoN) / (onePlusRtoN - 1));
  }

  // i. LVR threshold deposits from market config
  const lvrThresholds = marketConfig.lvrThresholds || [
    { lvr: 80, note: 'At 80% LVR' },
    { lvr: 90, note: 'At 90% LVR' },
  ];

  const depositNeeded = lvrThresholds.map(({ lvr, note }) => {
    const lvrFraction = lvr / 100;
    const deposit = maxBorrowing > 0
      ? Math.round(maxBorrowing / lvrFraction * (1 - lvrFraction))
      : 0;
    return { lvr, note, deposit };
  });

  // Keep named fields for backward compatibility (AU callers use depositNeeded80LVR / depositNeeded90LVR)
  const depositNeeded80LVR = depositNeeded.find((d) => d.lvr === 80)?.deposit ?? 0;
  const depositNeeded90LVR = depositNeeded.find((d) => d.lvr === 90 || d.lvr === 95)?.deposit ?? 0;

  return {
    market,
    maxBorrowing,
    monthlyRepayment,
    depositNeeded,
    depositNeeded80LVR,
    depositNeeded90LVR,
    netMonthlyIncome,
    totalMonthlyCommitments,
    availableSurplus,
    hemApplied,
    studentDebtMonthly,
    creditCardCommitment,
    effectiveAssessmentRate,
  };
}

module.exports = { calculate };
