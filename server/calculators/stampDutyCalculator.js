'use strict';

const path = require('path');
const brackets = require(path.join(__dirname, '../config/calculators/stampDutyBrackets.json'));

const LEGAL_FEES = 200000;
const INSPECTION_COSTS = 50000;

function computeBaseDuty(priceCents, stateConfig) {
  const priceWhole = Math.round(priceCents / 100);
  const stateKey = Object.keys(brackets).find(k => k === stateConfig._key);
  const bracketList = stateConfig.brackets;

  // NT special concession formula for properties up to $525,000
  if (stateConfig.ntConcessionFormula && priceWhole <= stateConfig.ntConcessionFormula.threshold) {
    const V = priceWhole / 1000;
    const dutyWhole = 0.06571441 * V + 15 * V * V / 1000000;
    const dutyMin = 20;
    return Math.round(Math.max(dutyMin, dutyWhole) * 100);
  }

  let matchedBracket = null;
  for (const bracket of bracketList) {
    if (bracket.formula === 'concession') continue;
    const belowMax = bracket.max === null || priceWhole <= bracket.max;
    if (priceWhole >= bracket.min && belowMax) {
      matchedBracket = bracket;
      break;
    }
  }

  if (!matchedBracket) {
    const last = bracketList[bracketList.length - 1];
    matchedBracket = last;
  }

  const dutyWhole = matchedBracket.base + (priceWhole - matchedBracket.min) * matchedBracket.rate;
  return Math.round(dutyWhole * 100);
}

function applyVicOffThePlan(priceCents) {
  // VIC off-the-plan: duty is calculated on land value only (approx 20% of purchase price)
  // The standard approach: use 20% of price as dutiable value
  return Math.round(priceCents * 0.20);
}

function calculate(inputs) {
  const {
    propertyPrice,
    state,
    buyerType,
    propertyType,
    primaryResidence,
    vicOffThePlan,
  } = inputs;

  const stateConfig = brackets[state];
  if (!stateConfig) {
    throw new Error(`Unknown state: ${state}`);
  }
  stateConfig._key = state;

  const notes = [];
  let concessionApplied = null;
  let dutiablePrice = propertyPrice;

  // VIC off-the-plan concession: only dutiable on land component
  if (vicOffThePlan && state === 'VIC' && (propertyType === 'new')) {
    dutiablePrice = applyVicOffThePlan(propertyPrice);
    notes.push('VIC off-the-plan concession applied: duty calculated on land component only (approx. 20% of purchase price)');
  }

  let stampDuty = computeBaseDuty(dutiablePrice, stateConfig);

  // First home buyer logic
  if (buyerType === 'firstHomeBuyer') {
    const priceWhole = Math.round(propertyPrice / 100);
    const { exemptionThreshold, concessionThreshold } = stateConfig.firstHomeBuyer;

    if (exemptionThreshold && priceWhole <= exemptionThreshold) {
      stampDuty = 0;
      concessionApplied = 'fullExemption';
      notes.push('Full first home buyer exemption applied — no stamp duty payable');
    } else if (concessionThreshold && priceWhole <= concessionThreshold) {
      // Partial concession: linear taper between exemptionThreshold and concessionThreshold
      const range = concessionThreshold - exemptionThreshold;
      const over = priceWhole - exemptionThreshold;
      const concessionFraction = 1 - over / range;
      const fullDuty = computeBaseDuty(propertyPrice, stateConfig);
      const discounted = Math.round(fullDuty * (1 - concessionFraction));
      stampDuty = discounted;
      concessionApplied = 'partialConcession';
      notes.push(`Partial first home buyer concession applied (${Math.round(concessionFraction * 100)}% discount)`);
    } else {
      notes.push('Property price exceeds first home buyer concession threshold — standard rates apply');
    }
  }

  // Foreign buyer surcharge
  if (buyerType === 'foreign' && stateConfig.foreignSurcharge > 0) {
    const surcharge = Math.round((propertyPrice / 100) * stateConfig.foreignSurcharge * 100);
    stampDuty += surcharge;
    notes.push(`Foreign buyer surcharge of ${stateConfig.foreignSurcharge * 100}% applied`);
  }

  if (!primaryResidence && buyerType === 'standard') {
    notes.push('Investment property — standard stamp duty rates apply (no primary residence concession)');
  }

  const totalUpfrontCost = stampDuty + LEGAL_FEES + INSPECTION_COSTS;
  const effectiveRate = propertyPrice > 0
    ? parseFloat(((stampDuty / propertyPrice) * 100).toFixed(2))
    : 0;

  return {
    stampDuty,
    concessionApplied,
    totalUpfrontCost,
    effectiveRate,
    legalFees: LEGAL_FEES,
    inspectionCosts: INSPECTION_COSTS,
    notes,
  };
}

module.exports = { calculate };
