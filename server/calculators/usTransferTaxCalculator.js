'use strict';

const path = require('path');
const config = require(path.join(__dirname, '../config/calculators/usTransferTax.json'));

const stateMap = {};
for (const s of config.states) {
  stateMap[s.code] = s;
}

function calculateTieredProgressiveTax(price, brackets) {
  let total = 0;
  for (const band of brackets) {
    if (price <= band.from) break;
    const taxableInBand = band.to === null
      ? price - band.from
      : Math.min(price, band.to) - band.from;
    if (taxableInBand <= 0) continue;
    total += taxableInBand * band.rateDecimal;
  }
  return total;
}

function calculateNYTransferTax(price, stateConfig) {
  const rates = stateConfig.rates;
  let stateTax = price * rates.stateTransferTax.standardRateDecimal;
  if (price > rates.stateTransferTax.highValueSurcharge.threshold) {
    stateTax = price * (
      rates.stateTransferTax.standardRateDecimal +
      rates.stateTransferTax.highValueSurcharge.additionalRateDecimal
    );
  }

  let mansionTax = 0;
  if (price >= 1000000) {
    const bracket = rates.mansionTax.brackets
      .slice()
      .reverse()
      .find(b => price >= b.from);
    if (bracket) {
      mansionTax = price * bracket.rateDecimal;
    }
  }

  return { stateTax, mansionTax };
}

function calculateDCTransferTax(price, buyerType) {
  const rates = stateMap['DC'].rates;
  const recordationBracket = rates.deedRecordationTax.brackets
    .find(b => b.to === null || price <= b.to) ||
    rates.deedRecordationTax.brackets[rates.deedRecordationTax.brackets.length - 1];

  const transferBracket = rates.realPropertyTransferTax.brackets
    .find(b => b.to === null || price <= b.to) ||
    rates.realPropertyTransferTax.brackets[rates.realPropertyTransferTax.brackets.length - 1];

  let recordation = price * recordationBracket.rateDecimal;
  const transfer = price * transferBracket.rateDecimal;

  let firstTimeBuyerExemption = 0;
  if (buyerType === 'first_time' && price < 625000) {
    firstTimeBuyerExemption = recordation;
    recordation = 0;
  }

  return { recordation, transfer, firstTimeBuyerExemption };
}

function calculateWashingtonREET(price) {
  const rates = stateMap['WA'].rates;
  return calculateTieredProgressiveTax(price, rates.brackets);
}

function calculateMortgageRecordingTax(state, loanAmount) {
  const stateConfig = stateMap[state];
  if (!stateConfig || !stateConfig.hasMortgageRecordingTax || !loanAmount) return 0;

  const mrt = stateConfig.mortgageRecordingTaxRate;
  if (!mrt) return 0;

  if (state === 'NY') {
    const rate = loanAmount >= mrt.threshold
      ? mrt.borrowerPortionHighValue
      : mrt.borrowerPortionStandard;
    return loanAmount * rate;
  }

  if (mrt.rateDecimal) {
    return loanAmount * mrt.rateDecimal;
  }

  if (mrt.typicalRateDecimal) {
    return loanAmount * mrt.typicalRateDecimal;
  }

  return 0;
}

function calculateStateTransferTax(stateConfig, price, buyerType) {
  if (!stateConfig.hasTransferTax) return 0;

  const { rateType, rates, code } = stateConfig;

  switch (rateType) {
    case 'none':
      return 0;

    case 'fixed':
      return rates.flatFee || 0;

    case 'flat_percentage': {
      const rate =
        rates.rateDecimal ||
        rates.standardRateDecimal ||
        rates.standardTotalRateDecimal ||
        rates.totalRateDecimal ||
        rates.stateRateDecimal ||
        rates.countyRateDecimal ||
        rates.stateMinimumRateDecimal ||
        rates.stateGrantorTaxRateDecimal ||
        rates.stateRateOwnerOccupied ||
        rates.buyerRateDecimal;
      if (rate == null) return 0;
      return price * rate;
    }

    case 'tiered': {
      if (code === 'NY') {
        const { stateTax, mansionTax } = calculateNYTransferTax(price, stateConfig);
        return stateTax + mansionTax;
      }

      if (code === 'DC') {
        const { recordation, transfer } = calculateDCTransferTax(price, buyerType);
        return recordation + transfer;
      }

      if (code === 'WA') {
        return calculateWashingtonREET(price);
      }

      if (rates && rates.brackets && Array.isArray(rates.brackets)) {
        return calculateTieredProgressiveTax(price, rates.brackets);
      }

      if (rates && rates.stateTax && rates.stateTax.rateDecimal) {
        return price * rates.stateTax.rateDecimal;
      }

      return 0;
    }

    default:
      return 0;
  }
}

function getFirstTimeBuyerExemption(stateConfig, price, buyerType) {
  if (buyerType !== 'first_time') return 0;
  if (!stateConfig.firstTimeBuyerExemption) return 0;

  if (stateConfig.code === 'DC') {
    const { firstTimeBuyerExemption } = calculateDCTransferTax(price, buyerType);
    return firstTimeBuyerExemption;
  }

  if (stateConfig.firstTimeBuyerDetails) {
    return 0;
  }

  return 0;
}

function calculate(inputs) {
  const {
    propertyPrice: priceCents,
    state,
    loanAmount: loanCents = 0,
    buyerType = 'standard',
    propertyType = 'primary',
    whoPays,
  } = inputs;

  if (!state) throw new Error('state is required');
  if (!priceCents || priceCents < 0) throw new Error('propertyPrice must be a positive number');

  // API sends propertyPrice in cents; engine operates in dollars
  const propertyPrice = Math.round(priceCents / 100);
  const loanAmount = Math.round(loanCents / 100);

  const stateConfig = stateMap[state];
  if (!stateConfig) throw new Error(`Unknown state: ${state}`);

  const stateTransferTax = calculateStateTransferTax(stateConfig, propertyPrice, buyerType);

  const firstTimeBuyerExemption = getFirstTimeBuyerExemption(stateConfig, propertyPrice, buyerType);

  const mortgageRecordingTax = loanAmount > 0
    ? calculateMortgageRecordingTax(state, loanAmount)
    : 0;

  const titleMin = propertyPrice * stateConfig.estimatedTitleInsurance.min;
  const titleMax = propertyPrice * stateConfig.estimatedTitleInsurance.max;

  const closingMin = propertyPrice * stateConfig.estimatedClosingCostPercent.min;
  const closingMax = propertyPrice * stateConfig.estimatedClosingCostPercent.max;

  const effectiveRate = propertyPrice > 0
    ? parseFloat(((stateTransferTax / propertyPrice) * 100).toFixed(4))
    : 0;

  const resolvedWhoPays = whoPays || stateConfig.whoPaysDefault;

  // Convert dollars to cents for consistent API response
  const toCents = (d) => Math.round(d * 100);

  return {
    stateTransferTax: toCents(stateTransferTax),
    mortgageRecordingTax: toCents(mortgageRecordingTax),
    estimatedTitleInsurance: {
      min: toCents(titleMin),
      max: toCents(titleMax),
    },
    estimatedTotalClosingCosts: {
      min: toCents(closingMin),
      max: toCents(closingMax),
    },
    effectiveRate,
    hasTransferTax: stateConfig.hasTransferTax,
    whoPays: resolvedWhoPays,
    stateName: stateConfig.name,
    disclaimer: config._meta.disclaimer,
    firstTimeBuyerExemption: toCents(firstTimeBuyerExemption),
  };
}

module.exports = { calculate };
