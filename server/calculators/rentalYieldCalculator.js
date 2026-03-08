'use strict';

function calculate(inputs) {
  const {
    purchasePrice,
    weeklyRent,
    managementFeeRate = 7,
    councilRates = 0,
    strataFees = 0,
    insurance = 0,
    maintenance = 0,
    landTax = 0,
    otherExpenses = 0,
  } = inputs;

  const annualRentalIncome = weeklyRent * 52;

  const managementFees = Math.round(annualRentalIncome * (managementFeeRate / 100));

  const totalAnnualExpenses =
    managementFees +
    councilRates +
    strataFees +
    insurance +
    maintenance +
    landTax +
    otherExpenses;

  const netAnnualIncome = annualRentalIncome - totalAnnualExpenses;

  const grossYield = parseFloat(((annualRentalIncome / purchasePrice) * 100).toFixed(2));
  const netYield = parseFloat(((netAnnualIncome / purchasePrice) * 100).toFixed(2));

  return {
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
}

module.exports = { calculate };
