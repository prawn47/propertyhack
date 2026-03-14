'use strict';

const config = require('../config/calculators/caTransferTax.json');

/**
 * Compute progressive bracket tax for a given price and bracket array.
 * Each bracket: { min, max, rate } where max=null means unbounded.
 * Returns the total tax as a number (dollars).
 */
function computeProgressiveTax(price, brackets) {
  let tax = 0;
  for (const bracket of brackets) {
    if (price <= bracket.min) break;
    const top = bracket.max === null ? price : Math.min(price, bracket.max);
    const taxable = top - bracket.min;
    tax += taxable * bracket.rate;
  }
  return tax;
}

/**
 * Alberta flat registration fee: $50 base + $5 per $5,000 (or part thereof).
 */
function computeAlbertaFee(amount, feeConfig) {
  const units = Math.ceil(amount / feeConfig.unitValue);
  return feeConfig.baseFee + units * feeConfig.perUnit;
}

/**
 * Newfoundland: $100 flat + $0.40 per $100 over $500.
 */
function computeNLFee(price, feeConfig) {
  const { baseFee, additionalRate, additionalThreshold } = feeConfig;
  if (price <= additionalThreshold) return baseFee;
  const over = price - additionalThreshold;
  // $0.40 per $100 = 0.004 rate
  return baseFee + over * additionalRate;
}

/**
 * BC first-time buyer rebate.
 * Full exemption up to fullExemptionThreshold.
 * Partial exemption (linear taper) between fullExemptionThreshold and partialExemptionThreshold.
 */
function computeBCFTBRebate(price, fullTax, exemption) {
  const { fullExemptionThreshold, partialExemptionThreshold } = exemption;
  if (price <= fullExemptionThreshold) {
    return fullTax; // full rebate
  }
  if (price <= partialExemptionThreshold) {
    const range = partialExemptionThreshold - fullExemptionThreshold;
    const over = price - fullExemptionThreshold;
    const fraction = 1 - over / range;
    return Math.round(fullTax * fraction * 100) / 100;
  }
  return 0;
}

/**
 * Main calculate function.
 *
 * Inputs:
 *   propertyPrice   - number (CAD dollars)
 *   province        - string (e.g. "ON", "BC", "QC", "AB", "SK", "MB", "NB", "NS", "NL", "PE", "YT", "NT", "NU")
 *   city            - string (optional, e.g. "Toronto", "Montreal", "Halifax Regional Municipality")
 *   buyerType       - "standard" | "first_time"
 *   isResident      - boolean (Canadian citizen or permanent resident)
 *   mortgageAmount  - number (optional, needed for Alberta mortgage registration fee)
 *
 * Returns:
 *   provincialTax        - number
 *   municipalTax         - number
 *   nonResidentTax       - number
 *   foreignBuyerTax      - number
 *   firstTimeBuyerRebate - number
 *   totalTax             - number (gross, pre-rebate)
 *   netTax               - number (after rebate)
 *   effectiveRate        - number (% of property price, net basis)
 *   hasLTT               - boolean
 *   taxLabel             - string
 *   eligibilityNote      - string | null
 */
function calculate(inputs) {
  const {
    propertyPrice: priceCents,
    province,
    city,
    buyerType = 'standard',
    isResident = true,
    mortgageAmount: mortgageCents = 0,
  } = inputs;

  if (!priceCents || priceCents <= 0) throw new Error('propertyPrice must be a positive number');

  // API sends propertyPrice in cents; engine operates in dollars
  const propertyPrice = Math.round(priceCents / 100);
  const mortgageAmount = Math.round(mortgageCents / 100);
  if (!province) throw new Error('province is required');

  const provinceConfig = config[province];
  if (!provinceConfig) throw new Error(`Unknown province: ${province}`);

  const isFirstTime = buyerType === 'first_time';
  const isNonResident = !isResident;

  let provincialTax = 0;
  let municipalTax = 0;
  let nonResidentTax = 0;
  let foreignBuyerTax = 0;
  let firstTimeBuyerRebate = 0;
  let eligibilityNote = null;

  const hasLTT = provinceConfig.hasLTT !== false;
  const taxLabel = provinceConfig.taxName;

  // ─── Alberta ───────────────────────────────────────────────────────────────
  if (province === 'AB') {
    const titleFee = computeAlbertaFee(propertyPrice, provinceConfig.registrationFees.titleTransfer);
    provincialTax = titleFee;

    if (mortgageAmount > 0) {
      const mortgageFee = computeAlbertaFee(mortgageAmount, provinceConfig.registrationFees.mortgageRegistration);
      municipalTax = mortgageFee; // reusing municipalTax field for mortgage registration fee
    }
    // Alberta has no FTB rebate, no NRST
  }

  // ─── Saskatchewan ──────────────────────────────────────────────────────────
  else if (province === 'SK') {
    provincialTax = propertyPrice * provinceConfig.registrationFees.titleTransfer.rate;
  }

  // ─── Newfoundland ──────────────────────────────────────────────────────────
  else if (province === 'NL') {
    provincialTax = computeNLFee(propertyPrice, provinceConfig.registrationFees.titleTransfer);
  }

  // ─── Territories (YT, NT, NU) ──────────────────────────────────────────────
  else if (['YT', 'NT', 'NU'].includes(province)) {
    provincialTax = provinceConfig.registrationFees.titleTransfer.estimatedFee;
  }

  // ─── Nova Scotia ───────────────────────────────────────────────────────────
  else if (province === 'NS') {
    // NS tax is municipal only — provincial portion is zero
    // Resolve municipality rate
    let muniRate = 0.01; // default fallback
    if (city) {
      const muniConfig = provinceConfig.municipalities.find(m => m.name === city);
      if (muniConfig) muniRate = muniConfig.rate;
    }
    municipalTax = propertyPrice * muniRate;
    provincialTax = 0;
  }

  // ─── New Brunswick ─────────────────────────────────────────────────────────
  else if (province === 'NB') {
    provincialTax = propertyPrice * provinceConfig.provincial.flatRate;
  }

  // ─── PEI ───────────────────────────────────────────────────────────────────
  else if (province === 'PE') {
    provincialTax = propertyPrice * provinceConfig.provincial.flatRate;

    if (isFirstTime && provinceConfig.provincial.firstTimeBuyerRebate) {
      const rebateConfig = provinceConfig.provincial.firstTimeBuyerRebate;
      if (rebateConfig.fullRebate) {
        firstTimeBuyerRebate = provincialTax;
      }
      eligibilityNote = rebateConfig.eligibilitySummary;
    }
  }

  // ─── Manitoba ──────────────────────────────────────────────────────────────
  else if (province === 'MB') {
    provincialTax = computeProgressiveTax(propertyPrice, provinceConfig.provincial.brackets);
  }

  // ─── Quebec ────────────────────────────────────────────────────────────────
  else if (province === 'QC') {
    const isMontreal = city && city.toLowerCase() === 'montreal';
    if (isMontreal) {
      // Montreal uses its own higher brackets, replaces provincial
      municipalTax = computeProgressiveTax(propertyPrice, provinceConfig.municipal.brackets);
      provincialTax = 0;
    } else {
      provincialTax = computeProgressiveTax(propertyPrice, provinceConfig.provincial.brackets);
    }
    // QC has no FTB rebate
  }

  // ─── British Columbia ──────────────────────────────────────────────────────
  else if (province === 'BC') {
    provincialTax = computeProgressiveTax(propertyPrice, provinceConfig.provincial.brackets);

    if (isFirstTime && provinceConfig.provincial.firstTimeBuyerExemption) {
      const exemption = provinceConfig.provincial.firstTimeBuyerExemption;
      firstTimeBuyerRebate = computeBCFTBRebate(propertyPrice, provincialTax, exemption);
      eligibilityNote = exemption.eligibilitySummary;
    }

    if (isNonResident && provinceConfig.provincial.foreignBuyerTax) {
      foreignBuyerTax = propertyPrice * provinceConfig.provincial.foreignBuyerTax.rate;
    }
  }

  // ─── Ontario ───────────────────────────────────────────────────────────────
  else if (province === 'ON') {
    provincialTax = computeProgressiveTax(propertyPrice, provinceConfig.provincial.brackets);

    const isToronto = city && city.toLowerCase() === 'toronto';
    if (isToronto) {
      municipalTax = computeProgressiveTax(propertyPrice, provinceConfig.municipal.brackets);
    }

    // First-time buyer rebates
    if (isFirstTime && provinceConfig.provincial.firstTimeBuyerRebate) {
      const provRebate = provinceConfig.provincial.firstTimeBuyerRebate;
      firstTimeBuyerRebate += Math.min(provincialTax, provRebate.maxRebate);
      eligibilityNote = provRebate.eligibilitySummary;

      if (isToronto && provinceConfig.municipal.firstTimeBuyerRebate) {
        const muniRebate = provinceConfig.municipal.firstTimeBuyerRebate;
        firstTimeBuyerRebate += Math.min(municipalTax, muniRebate.maxRebate);
      }
    }

    // Non-Resident Speculation Tax (NRST)
    if (isNonResident && provinceConfig.provincial.nonResidentSpeculationTax) {
      nonResidentTax = propertyPrice * provinceConfig.provincial.nonResidentSpeculationTax.rate;
    }
  }

  // ─── Totals ────────────────────────────────────────────────────────────────
  const totalTax = provincialTax + municipalTax + nonResidentTax + foreignBuyerTax;
  const netTax = Math.max(0, totalTax - firstTimeBuyerRebate);
  const effectiveRate = propertyPrice > 0
    ? parseFloat(((netTax / propertyPrice) * 100).toFixed(4))
    : 0;

  // Convert dollars to cents for consistent API response
  const toCents = (d) => Math.round(d * 100);

  return {
    provincialTax: toCents(provincialTax),
    municipalTax: toCents(municipalTax),
    nonResidentTax: toCents(nonResidentTax),
    foreignBuyerTax: toCents(foreignBuyerTax),
    firstTimeBuyerRebate: toCents(firstTimeBuyerRebate),
    totalTax: toCents(totalTax),
    netTax: toCents(netTax),
    effectiveRate,
    hasLTT,
    taxLabel,
    eligibilityNote,
  };
}

module.exports = { calculate };
