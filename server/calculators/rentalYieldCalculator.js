'use strict';

function calculate(inputs) {
  const {
    purchasePrice,
    weeklyRent,
    monthlyRent,
    rentFrequency = 'weekly',
    managementFeeRate = 7,
    councilRates = 0,
    strataFees = 0,
    insurance = 0,
    maintenance = 0,
    landTax = 0,
    groundRent = 0,
    propertyTax = 0,
    otherExpenses = 0,
    // NZ interest deductibility
    interestDeductibilityEnabled = false,
    marginalTaxRate = 0,
    mortgageBalance = 0,
    mortgageInterestRate = 0,
  } = inputs;

  let annualRentalIncome;
  if (rentFrequency === 'monthly') {
    const monthly = monthlyRent ?? weeklyRent;
    annualRentalIncome = monthly * 12;
  } else {
    annualRentalIncome = weeklyRent * 52;
  }

  const managementFees = Math.round(annualRentalIncome * (managementFeeRate / 100));

  const totalAnnualExpenses =
    managementFees +
    councilRates +
    strataFees +
    insurance +
    maintenance +
    landTax +
    groundRent +
    propertyTax +
    otherExpenses;

  const netAnnualIncome = annualRentalIncome - totalAnnualExpenses;

  const grossYield = parseFloat(((annualRentalIncome / purchasePrice) * 100).toFixed(2));
  const netYield = parseFloat(((netAnnualIncome / purchasePrice) * 100).toFixed(2));

  const result = {
    grossYield,
    netYield,
    annualRentalIncome,
    totalAnnualExpenses,
    netAnnualIncome,
    managementFees,
    chartData: {
      grossYield,
      netYield,
    },
  };

  // NZ interest deductibility: 100% deductible from April 2025
  if (interestDeductibilityEnabled && mortgageBalance > 0 && mortgageInterestRate > 0 && marginalTaxRate > 0) {
    const annualInterest = Math.round(mortgageBalance * (mortgageInterestRate / 100));
    const taxSaving = Math.round(annualInterest * (marginalTaxRate / 100));
    const afterTaxNetIncome = netAnnualIncome + taxSaving;
    const afterTaxNetYield = parseFloat(((afterTaxNetIncome / purchasePrice) * 100).toFixed(2));
    result.interestDeductibility = {
      annualInterest,
      taxSaving,
      afterTaxNetIncome,
      afterTaxNetYield,
    };
  }

  return result;
}

module.exports = { calculate };
