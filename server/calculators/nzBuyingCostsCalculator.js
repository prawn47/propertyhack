'use strict';

const path = require('path');
const config = require(path.join(__dirname, '../config/calculators/nzBuyingCosts.json'));

function calculate(inputs) {
  const {
    propertyPrice: priceCents,
    buyerType,
    firstHomeBuyer,
    depositPercentage,
    newBuild,
  } = inputs;

  if (!priceCents || priceCents <= 0) {
    throw new Error('propertyPrice must be a positive number');
  }

  // API sends propertyPrice in cents; engine operates in dollars
  const propertyPrice = Math.round(priceCents / 100);

  const depositPct = depositPercentage != null ? depositPercentage : 20;
  const loanAmount = propertyPrice * (1 - depositPct / 100);
  const isLowEquity = depositPct < config.lowEquityPremium.triggerDepositThreshold * 100;

  const lineItems = [];
  const notes = [];

  // Fixed cost ranges
  const { legal, buildingInspection, valuation, lim } = config.costs;
  lineItems.push({ label: legal.label, min: legal.min, max: legal.max, note: legal.note });
  lineItems.push({ label: buildingInspection.label, min: buildingInspection.min, max: buildingInspection.max, note: buildingInspection.note });
  lineItems.push({ label: valuation.label, min: valuation.min, max: valuation.max, note: valuation.note });
  lineItems.push({ label: lim.label, min: lim.min, max: lim.max, note: lim.note });

  // Low equity premium
  let lepMin = 0;
  let lepMax = 0;
  if (isLowEquity) {
    if (firstHomeBuyer) {
      const lepCfg = config.lowEquityPremium.firstHomeLoan;
      const lepAmount = Math.round(loanAmount * lepCfg.rate);
      lepMin = lepAmount;
      lepMax = lepAmount;
      lineItems.push({
        label: lepCfg.label,
        min: lepMin,
        max: lepMax,
        note: lepCfg.note,
      });
    } else {
      const lepCfg = config.lowEquityPremium.standard;
      lepMin = Math.round(loanAmount * lepCfg.minRate);
      lepMax = Math.round(loanAmount * lepCfg.maxRate);
      lineItems.push({
        label: lepCfg.label,
        min: lepMin,
        max: lepMax,
        note: lepCfg.note,
      });
    }
  }

  // Regulatory notes
  if (newBuild) {
    notes.push(config.gst.newBuildNote);
  }

  if (buyerType === 'investor') {
    notes.push(config.brightLineTest.investorNote);
    notes.push(config.interestDeductibility.investorNote);
  }

  const totalMin = lineItems.reduce((sum, item) => sum + item.min, 0);
  const totalMax = lineItems.reduce((sum, item) => sum + item.max, 0);

  // Convert dollar amounts to cents for consistent API response
  const toCents = (d) => Math.round(d * 100);

  return {
    noTransferTax: config.noTransferTax,
    noTransferTaxNote: config.noTransferTaxNote,
    propertyPrice: toCents(propertyPrice),
    depositPercentage: depositPct,
    loanAmount: toCents(Math.round(loanAmount)),
    isLowEquity,
    lineItems: lineItems.map(item => ({
      ...item,
      min: toCents(item.min),
      max: toCents(item.max),
    })),
    totalMin: toCents(totalMin),
    totalMax: toCents(totalMax),
    notes,
  };
}

module.exports = { calculate };
