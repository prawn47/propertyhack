'use strict';

const config = require('../config/calculators/ukTransferTax.json');

function applyProgressiveBands(price, bands) {
  const result = [];
  let total = 0;

  for (const band of bands) {
    // Config uses "from: 125001" to indicate the band starts above £125,000.
    // Normalise to the actual lower boundary for arithmetic: 125001 → 125000.
    const lowerBoundary = band.from > 0 ? band.from - 1 : 0;
    if (price <= lowerBoundary) break;
    const upper = band.to === null ? price : Math.min(price, band.to);
    const taxable = upper - lowerBoundary;
    const amount = Math.round(taxable * band.rate * 100) / 100;
    result.push({ from: lowerBoundary, to: upper, rate: band.rate, amount });
    total += amount;
  }

  return { bands: result, total: Math.round(total * 100) / 100 };
}

function calculateForRegion(propertyPrice, location, buyerType, ukResident) {
  const regionKey = location === 'england' ? 'england_and_northern_ireland' : location;
  const regionConfig = config[regionKey];

  if (!regionConfig) {
    throw new Error(`Unknown location: ${location}`);
  }

  const surcharges = [];
  let bands;
  let taxAmount;
  let note = null;

  if (location === 'england_and_northern_ireland' || location === 'england') {
    const engConfig = config['england_and_northern_ireland'];

    if (buyerType === 'additional') {
      const surchargeRate = engConfig.additionalPropertySurcharge;
      const adjustedBands = engConfig.standardBands.map(b => ({
        ...b,
        rate: b.rate + surchargeRate,
      }));
      const result = applyProgressiveBands(propertyPrice, adjustedBands);
      bands = result.bands;
      taxAmount = result.total;
      surcharges.push({
        label: 'Additional property surcharge (5% per band)',
        note: 'An additional 5% is added to each rate band for additional residential properties.',
      });
    } else if (buyerType === 'first_time') {
      if (propertyPrice > engConfig.firstTimeBuyerMaxPropertyPrice) {
        const result = applyProgressiveBands(propertyPrice, engConfig.standardBands);
        bands = result.bands;
        taxAmount = result.total;
        note = engConfig.firstTimeBuyerNote;
      } else {
        const result = applyProgressiveBands(propertyPrice, engConfig.firstTimeBuyerBands);
        bands = result.bands;
        taxAmount = result.total;
      }
    } else {
      const result = applyProgressiveBands(propertyPrice, engConfig.standardBands);
      bands = result.bands;
      taxAmount = result.total;
    }

    if (!ukResident) {
      const nonResidentAmount = Math.round(propertyPrice * engConfig.nonResidentSurcharge * 100) / 100;
      taxAmount = Math.round((taxAmount + nonResidentAmount) * 100) / 100;
      surcharges.push({
        label: `Non-UK resident surcharge (${engConfig.nonResidentSurcharge * 100}% of full price)`,
        amount: nonResidentAmount,
        note: engConfig.nonResidentSurchargeNote,
      });
    }

    return {
      taxAmount,
      taxName: config['england_and_northern_ireland'].taxName,
      abbreviation: config['england_and_northern_ireland'].abbreviation,
      bands,
      effectiveRate: propertyPrice > 0
        ? parseFloat(((taxAmount / propertyPrice) * 100).toFixed(4))
        : 0,
      surcharges,
      note,
    };
  }

  if (location === 'scotland') {
    const scotConfig = config['scotland'];

    const bandsToUse = buyerType === 'first_time'
      ? scotConfig.firstTimeBuyerBands
      : scotConfig.standardBands;

    const result = applyProgressiveBands(propertyPrice, bandsToUse);
    bands = result.bands;
    taxAmount = result.total;

    if (buyerType === 'additional') {
      const ads = scotConfig.additionalDwellingSupplement;
      const adsAmount = Math.round(propertyPrice * ads.rate * 100) / 100;
      taxAmount = Math.round((taxAmount + adsAmount) * 100) / 100;
      surcharges.push({
        label: `Additional Dwelling Supplement (ADS) — ${ads.rate * 100}% of full purchase price`,
        amount: adsAmount,
        note: ads.note,
      });
    }

    return {
      taxAmount,
      taxName: scotConfig.taxName,
      abbreviation: scotConfig.abbreviation,
      bands,
      effectiveRate: propertyPrice > 0
        ? parseFloat(((taxAmount / propertyPrice) * 100).toFixed(4))
        : 0,
      surcharges,
      note,
    };
  }

  if (location === 'wales') {
    const walesConfig = config['wales'];

    const bandsToUse = buyerType === 'additional'
      ? walesConfig.additionalPropertyBands
      : walesConfig.standardBands;

    if (buyerType === 'additional') {
      surcharges.push({
        label: 'Higher rates for additional properties',
        note: walesConfig.additionalPropertyNote,
      });
    }

    if (buyerType === 'first_time') {
      note = walesConfig.firstTimeBuyerNote;
    }

    const result = applyProgressiveBands(propertyPrice, bandsToUse);
    bands = result.bands;
    taxAmount = result.total;

    return {
      taxAmount,
      taxName: walesConfig.taxName,
      abbreviation: walesConfig.abbreviation,
      bands,
      effectiveRate: propertyPrice > 0
        ? parseFloat(((taxAmount / propertyPrice) * 100).toFixed(4))
        : 0,
      surcharges,
      note,
    };
  }

  throw new Error(`Unhandled location: ${location}`);
}

function calculate(inputs) {
  const { propertyPrice: pricePence, location, buyerType, ukResident } = inputs;

  if (!pricePence || pricePence <= 0) {
    throw new Error('propertyPrice must be a positive number');
  }

  // API sends propertyPrice in pence; engine operates in pounds
  const propertyPrice = Math.round(pricePence / 100);

  const validLocations = ['england', 'england_and_northern_ireland', 'scotland', 'wales'];
  if (!validLocations.includes(location)) {
    throw new Error(`location must be one of: england, scotland, wales`);
  }

  const validBuyerTypes = ['standard', 'first_time', 'additional'];
  if (!validBuyerTypes.includes(buyerType)) {
    throw new Error(`buyerType must be one of: standard, first_time, additional`);
  }

  const normalizedLocation = location === 'england' ? 'england_and_northern_ireland' : location;

  const primary = calculateForRegion(propertyPrice, normalizedLocation, buyerType, ukResident !== false);

  const comparisonRegions = ['england_and_northern_ireland', 'scotland', 'wales'].filter(
    r => r !== normalizedLocation
  );

  const comparison = {};
  for (const region of comparisonRegions) {
    const comp = calculateForRegion(propertyPrice, region, 'standard', true);
    comparison[region] = {
      taxName: comp.taxName,
      abbreviation: comp.abbreviation,
      taxAmount: comp.taxAmount,
      effectiveRate: comp.effectiveRate,
    };
  }

  comparison[normalizedLocation] = {
    taxName: primary.taxName,
    abbreviation: primary.abbreviation,
    taxAmount: primary.taxAmount,
    effectiveRate: primary.effectiveRate,
  };

  // Convert pounds to pence for consistent cents-based API responses
  const toPence = (pounds) => Math.round(pounds * 100);
  const convertBands = (bands) => bands.map(b => ({
    ...b,
    from: toPence(b.from),
    to: toPence(b.to),
    amount: toPence(b.amount),
  }));

  return {
    taxAmount: toPence(primary.taxAmount),
    taxName: primary.taxName,
    abbreviation: primary.abbreviation,
    bands: convertBands(primary.bands),
    effectiveRate: primary.effectiveRate,
    surcharges: primary.surcharges.map(s => ({
      ...s,
      amount: s.amount != null ? toPence(s.amount) : undefined,
    })),
    note: primary.note,
    comparison: Object.fromEntries(
      Object.entries(comparison).map(([k, v]) => [k, {
        ...v,
        taxAmount: toPence(v.taxAmount),
      }])
    ),
  };
}

module.exports = { calculate, calculateForRegion };
