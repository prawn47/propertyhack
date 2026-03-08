'use strict';

const path = require('path');
const marketDefaults = require(path.join(__dirname, '../config/calculators/marketDefaults.json'));

const CMHC_PREMIUMS = [
  { minDownPercent: 5, maxDownPercent: 9.99, rate: 0.04 },
  { minDownPercent: 10, maxDownPercent: 14.99, rate: 0.031 },
  { minDownPercent: 15, maxDownPercent: 19.99, rate: 0.028 },
];

function getCmhcPremiumRate(downPercent) {
  for (const tier of CMHC_PREMIUMS) {
    if (downPercent >= tier.minDownPercent && downPercent <= tier.maxDownPercent) {
      return tier.rate;
    }
  }
  return 0;
}

function calculate(inputs) {
  const { propertyPrice, deposit, loanTermYears, interestRate, repaymentType, frequency, market } = inputs;

  const marketKey = (market || 'AU').toUpperCase();
  const mktConfig = (marketDefaults[marketKey] || marketDefaults['AU']).mortgage;
  const terminology = mktConfig.terminology || {};

  const depositPercent = (deposit / propertyPrice) * 100;
  let loanAmount = propertyPrice - deposit;
  const lvr = (loanAmount / propertyPrice) * 100;
  const lvrThreshold = mktConfig.lvrThreshold || 80;
  const lvrWarning = lvr > lvrThreshold;

  // --- CA: CMHC premium ---
  let cmhcPremium = null;
  if (marketKey === 'CA' && depositPercent < 20) {
    const premiumRate = getCmhcPremiumRate(depositPercent);
    if (premiumRate > 0) {
      const premiumAmountCents = Math.round(loanAmount * premiumRate);
      cmhcPremium = {
        rate: premiumRate,
        ratePercent: (premiumRate * 100).toFixed(2),
        amountCents: premiumAmountCents,
        note: `CMHC mortgage default insurance of ${(premiumRate * 100).toFixed(2)}% is added to your mortgage balance.`,
      };
      loanAmount += premiumAmountCents;
    }
  }

  // --- CA: amortization warning ---
  let caAmortizationNote = null;
  if (marketKey === 'CA' && depositPercent < 20 && loanTermYears > 25) {
    caAmortizationNote = 'Insured mortgages (less than 20% down) are limited to a 25-year amortization.';
  }

  const monthlyRate = interestRate / 100 / 12;
  const totalMonths = loanTermYears * 12;

  let monthlyPaymentCents;

  if (repaymentType === 'IO') {
    monthlyPaymentCents = Math.round(loanAmount * monthlyRate);
  } else {
    if (monthlyRate === 0) {
      monthlyPaymentCents = Math.round(loanAmount / totalMonths);
    } else {
      const factor = Math.pow(1 + monthlyRate, totalMonths);
      monthlyPaymentCents = Math.round(loanAmount * (monthlyRate * factor) / (factor - 1));
    }
  }

  // --- US: PMI estimate ---
  let pmi = null;
  if (marketKey === 'US' && lvr > 80) {
    const pmiAnnualLow = Math.round(loanAmount * 0.005);
    const pmiAnnualHigh = Math.round(loanAmount * 0.015);
    const pmiMonthlyLow = Math.round(pmiAnnualLow / 12);
    const pmiMonthlyHigh = Math.round(pmiAnnualHigh / 12);
    pmi = {
      monthlyLowCents: pmiMonthlyLow,
      monthlyHighCents: pmiMonthlyHigh,
      note: 'PMI can typically be removed once you reach 20% equity.',
    };
  }

  // --- NZ: Low equity premium note ---
  let nzLepNote = null;
  if (marketKey === 'NZ' && lvr > 80) {
    nzLepNote = mktConfig.lvrThresholdDetail || 'NZ banks charge a low equity premium (LEP) — typically 0.25%–1.0% added to interest rate.';
  }

  // --- Repayment frequency ---
  let repaymentAmount;
  if (frequency === 'weekly') {
    repaymentAmount = Math.round(monthlyPaymentCents * 12 / 52);
  } else if (frequency === 'fortnightly') {
    repaymentAmount = Math.round(monthlyPaymentCents * 12 / 26);
  } else if (frequency === 'bi-weekly') {
    repaymentAmount = Math.round(monthlyPaymentCents * 12 / 26);
  } else if (frequency === 'accelerated-bi-weekly') {
    repaymentAmount = Math.round(monthlyPaymentCents / 2);
  } else {
    repaymentAmount = monthlyPaymentCents;
  }

  const chartData = [];
  const yearlyBreakdown = [];

  if (repaymentType === 'IO') {
    const annualInterest = Math.round(loanAmount * monthlyRate * 12);
    for (let year = 1; year <= loanTermYears; year++) {
      chartData.push({ year, principalPaid: 0, interestPaid: annualInterest, balance: loanAmount });
      yearlyBreakdown.push({ year, payment: annualInterest, principal: 0, interest: annualInterest, balance: loanAmount });
    }
    const totalInterest = annualInterest * loanTermYears;
    const totalRepaid = loanAmount + totalInterest;
    return {
      repaymentAmount,
      totalInterest,
      totalRepaid,
      lvr: Math.round(lvr * 100) / 100,
      lvrWarning,
      lmiWarning: lvrWarning,
      chartData,
      yearlyBreakdown,
      market: marketKey,
      terminology,
      lvrLabel: terminology.lvrLabel || 'LVR',
      lvrThresholdNote: lvrWarning ? mktConfig.lvrThresholdNote : null,
      cmhcPremium,
      caAmortizationNote,
      pmi,
      nzLepNote,
    };
  }

  let balance = loanAmount;
  let totalInterestPaid = 0;

  for (let year = 1; year <= loanTermYears; year++) {
    let yearPrincipal = 0;
    let yearInterest = 0;

    for (let month = 1; month <= 12; month++) {
      if (balance <= 0) break;
      const interestThisMonth = Math.round(balance * monthlyRate);
      let principalThisMonth = monthlyPaymentCents - interestThisMonth;
      if (principalThisMonth > balance) {
        principalThisMonth = balance;
      }
      balance -= principalThisMonth;
      yearPrincipal += principalThisMonth;
      yearInterest += interestThisMonth;
    }

    totalInterestPaid += yearInterest;

    chartData.push({
      year,
      principalPaid: yearPrincipal,
      interestPaid: yearInterest,
      balance: Math.max(0, balance),
    });

    yearlyBreakdown.push({
      year,
      payment: yearPrincipal + yearInterest,
      principal: yearPrincipal,
      interest: yearInterest,
      balance: Math.max(0, balance),
    });
  }

  const totalRepaid = loanAmount + totalInterestPaid;

  return {
    repaymentAmount,
    totalInterest: totalInterestPaid,
    totalRepaid,
    lvr: Math.round(lvr * 100) / 100,
    lvrWarning,
    lmiWarning: lvrWarning,
    chartData,
    yearlyBreakdown,
    market: marketKey,
    terminology,
    lvrLabel: terminology.lvrLabel || 'LVR',
    lvrThresholdNote: lvrWarning ? mktConfig.lvrThresholdNote : null,
    cmhcPremium,
    caAmortizationNote,
    pmi,
    nzLepNote,
  };
}

module.exports = { calculate };
