'use strict';

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const path = require('path');
const router = express.Router();

const mortgageCalculator = require('../../calculators/mortgageCalculator');
const stampDutyCalculator = require('../../calculators/stampDutyCalculator');
const rentalYieldCalculator = require('../../calculators/rentalYieldCalculator');
const borrowingPowerCalculator = require('../../calculators/borrowingPowerCalculator');
const rentVsBuyCalculator = require('../../calculators/rentVsBuyCalculator');

const SUPPORTED_MARKETS = ['AU', 'US', 'UK', 'CA', 'NZ'];

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  return null;
}

function getMarket(req) {
  return (req.query.market || 'AU').toUpperCase();
}

function loadCalculator(name) {
  try {
    return require(`../../calculators/${name}`);
  } catch {
    return null;
  }
}

const marketQueryValidator = query('market')
  .optional()
  .isIn(SUPPORTED_MARKETS)
  .withMessage(`market must be one of: ${SUPPORTED_MARKETS.join(', ')}`);

// POST /api/calculators/mortgage/calculate
router.post(
  '/mortgage/calculate',
  [
    marketQueryValidator,
    body('propertyPrice').isInt({ min: 0 }).withMessage('propertyPrice must be a non-negative integer (cents)'),
    body('deposit').isInt({ min: 0 }).withMessage('deposit must be a non-negative integer (cents)'),
    body('loanTermYears').isInt({ min: 1, max: 50 }).withMessage('loanTermYears must be between 1 and 50'),
    body('interestRate').isFloat({ min: 0, max: 100 }).withMessage('interestRate must be between 0 and 100'),
    body('repaymentType').isIn(['PI', 'IO']).withMessage('repaymentType must be PI or IO'),
    body('frequency').isIn(['weekly', 'fortnightly', 'monthly']).withMessage('frequency must be weekly, fortnightly, or monthly'),
  ],
  (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const market = getMarket(req);
      const result = mortgageCalculator.calculate({ ...req.body, market });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Calculation failed', message: err.message });
    }
  }
);

// POST /api/calculators/stamp-duty/calculate
// Dispatches by market:
//   AU -> stampDutyCalculator (existing)
//   UK -> ukTransferTaxCalculator (merged from T9)
//   CA -> caTransferTaxCalculator (merged from T15)
//   US -> usTransferTaxCalculator (merged from T19)
//   NZ -> informational error (no stamp duty in NZ)
router.post(
  '/stamp-duty/calculate',
  [
    marketQueryValidator,
    body('propertyPrice').isInt({ min: 0 }).withMessage('propertyPrice must be a non-negative integer (cents)'),
    body('state').optional().isIn(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']).withMessage('state must be a valid Australian state or territory'),
    body('buyerType').optional().isIn(['firstHomeBuyer', 'standard', 'foreign']).withMessage('buyerType must be firstHomeBuyer, standard, or foreign'),
    body('propertyType').optional().isIn(['established', 'new', 'vacant_land']).withMessage('propertyType must be established, new, or vacant_land'),
    body('primaryResidence').optional().isBoolean().withMessage('primaryResidence must be a boolean'),
    body('vicOffThePlan').optional().isBoolean().withMessage('vicOffThePlan must be a boolean'),
  ],
  (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const market = getMarket(req);

    try {
      if (market === 'AU') {
        const { state, buyerType, propertyType, primaryResidence } = req.body;
        if (!state) return res.status(400).json({ error: 'Validation failed', details: [{ msg: 'state is required for AU market' }] });
        if (!buyerType) return res.status(400).json({ error: 'Validation failed', details: [{ msg: 'buyerType is required for AU market' }] });
        if (!propertyType) return res.status(400).json({ error: 'Validation failed', details: [{ msg: 'propertyType is required for AU market' }] });
        if (primaryResidence === undefined) return res.status(400).json({ error: 'Validation failed', details: [{ msg: 'primaryResidence is required for AU market' }] });

        const inputs = { ...req.body, vicOffThePlan: req.body.vicOffThePlan ?? false };
        const result = stampDutyCalculator.calculate(inputs);
        return res.json(result);
      }

      if (market === 'UK') {
        const ukCalculator = loadCalculator('ukTransferTaxCalculator');
        if (!ukCalculator) return res.status(501).json({ error: 'UK transfer tax calculator not yet available' });
        const result = ukCalculator.calculate({ ...req.body, market });
        return res.json(result);
      }

      if (market === 'CA') {
        const caCalculator = loadCalculator('caTransferTaxCalculator');
        if (!caCalculator) return res.status(501).json({ error: 'CA transfer tax calculator not yet available' });
        const result = caCalculator.calculate({ ...req.body, market });
        return res.json(result);
      }

      if (market === 'US') {
        const usCalculator = loadCalculator('usTransferTaxCalculator');
        if (!usCalculator) return res.status(501).json({ error: 'US transfer tax calculator not yet available' });
        const result = usCalculator.calculate({ ...req.body, market });
        return res.json(result);
      }

      if (market === 'NZ') {
        return res.status(400).json({
          error: 'No stamp duty in NZ',
          message: 'New Zealand does not have stamp duty. Use /api/calculators/buying-costs/calculate for NZ buying cost estimates.',
        });
      }

      return res.status(400).json({ error: `Unsupported market: ${market}` });
    } catch (err) {
      return res.status(500).json({ error: 'Calculation failed', message: err.message });
    }
  }
);

// POST /api/calculators/transfer-tax/calculate
// Unified endpoint with same dispatch logic as stamp-duty
router.post(
  '/transfer-tax/calculate',
  [
    marketQueryValidator,
    body('propertyPrice').isInt({ min: 0 }).withMessage('propertyPrice must be a non-negative integer (cents)'),
  ],
  (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const market = getMarket(req);

    try {
      if (market === 'AU') {
        const { state, buyerType, propertyType, primaryResidence } = req.body;
        if (!state) return res.status(400).json({ error: 'Validation failed', details: [{ msg: 'state is required for AU market' }] });
        if (!buyerType) return res.status(400).json({ error: 'Validation failed', details: [{ msg: 'buyerType is required for AU market' }] });
        if (!propertyType) return res.status(400).json({ error: 'Validation failed', details: [{ msg: 'propertyType is required for AU market' }] });
        if (primaryResidence === undefined) return res.status(400).json({ error: 'Validation failed', details: [{ msg: 'primaryResidence is required for AU market' }] });

        const inputs = { ...req.body, vicOffThePlan: req.body.vicOffThePlan ?? false };
        const result = stampDutyCalculator.calculate(inputs);
        return res.json(result);
      }

      if (market === 'UK') {
        const ukCalculator = loadCalculator('ukTransferTaxCalculator');
        if (!ukCalculator) return res.status(501).json({ error: 'UK transfer tax calculator not yet available' });
        const result = ukCalculator.calculate({ ...req.body, market });
        return res.json(result);
      }

      if (market === 'CA') {
        const caCalculator = loadCalculator('caTransferTaxCalculator');
        if (!caCalculator) return res.status(501).json({ error: 'CA transfer tax calculator not yet available' });
        const result = caCalculator.calculate({ ...req.body, market });
        return res.json(result);
      }

      if (market === 'US') {
        const usCalculator = loadCalculator('usTransferTaxCalculator');
        if (!usCalculator) return res.status(501).json({ error: 'US transfer tax calculator not yet available' });
        const result = usCalculator.calculate({ ...req.body, market });
        return res.json(result);
      }

      if (market === 'NZ') {
        return res.status(400).json({
          error: 'No stamp duty in NZ',
          message: 'New Zealand does not have stamp duty. Use /api/calculators/buying-costs/calculate for NZ buying cost estimates.',
        });
      }

      return res.status(400).json({ error: `Unsupported market: ${market}` });
    } catch (err) {
      return res.status(500).json({ error: 'Calculation failed', message: err.message });
    }
  }
);

// POST /api/calculators/rental-yield/calculate
router.post(
  '/rental-yield/calculate',
  [
    marketQueryValidator,
    body('purchasePrice').isInt({ min: 0 }).withMessage('purchasePrice must be a non-negative integer (cents)'),
    body('weeklyRent').isInt({ min: 0 }).withMessage('weeklyRent must be a non-negative integer (cents)'),
    body('managementFeeRate').optional().isFloat({ min: 0, max: 100 }).withMessage('managementFeeRate must be between 0 and 100'),
    body('councilRates').optional().isInt({ min: 0 }).withMessage('councilRates must be a non-negative integer (cents)'),
    body('strataFees').optional().isInt({ min: 0 }).withMessage('strataFees must be a non-negative integer (cents)'),
    body('insurance').optional().isInt({ min: 0 }).withMessage('insurance must be a non-negative integer (cents)'),
    body('maintenance').optional().isInt({ min: 0 }).withMessage('maintenance must be a non-negative integer (cents)'),
    body('landTax').optional().isInt({ min: 0 }).withMessage('landTax must be a non-negative integer (cents)'),
    body('otherExpenses').optional().isInt({ min: 0 }).withMessage('otherExpenses must be a non-negative integer (cents)'),
  ],
  (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const market = getMarket(req);
      const result = rentalYieldCalculator.calculate({ ...req.body, market });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Calculation failed', message: err.message });
    }
  }
);

// POST /api/calculators/borrowing-power/calculate
router.post(
  '/borrowing-power/calculate',
  [
    marketQueryValidator,
    body('applicants').optional().isInt({ min: 1, max: 2 }).withMessage('applicants must be 1 or 2'),
    body('grossIncome1').isInt({ min: 0 }).withMessage('grossIncome1 must be a non-negative integer (cents)'),
    body('grossIncome2').optional().isInt({ min: 0 }).withMessage('grossIncome2 must be a non-negative integer (cents)'),
    body('otherIncome').optional().isInt({ min: 0 }).withMessage('otherIncome must be a non-negative integer (cents)'),
    body('monthlyLivingExpenses').optional().isInt({ min: 0 }).withMessage('monthlyLivingExpenses must be a non-negative integer (cents)'),
    body('creditCardLimits').optional().isInt({ min: 0 }).withMessage('creditCardLimits must be a non-negative integer (cents)'),
    body('existingLoanRepayments').optional().isInt({ min: 0 }).withMessage('existingLoanRepayments must be a non-negative integer (cents)'),
    // hecsDebt: backward compat (AU only). studentDebt is the new multi-market field.
    body('hecsDebt').optional().isInt({ min: 0 }).withMessage('hecsDebt must be a non-negative integer (cents)'),
    body('studentDebt').optional(),
    body('dependants').optional().isInt({ min: 0, max: 10 }).withMessage('dependants must be between 0 and 10'),
    body('assessmentRate').optional().isFloat({ min: 0, max: 100 }).withMessage('assessmentRate must be between 0 and 100'),
  ],
  (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const market = getMarket(req);
      const inputs = { ...req.body, market };
      // backward compat: hecsDebt maps to studentDebt for AU
      if (inputs.hecsDebt !== undefined && inputs.studentDebt === undefined) {
        inputs.studentDebt = inputs.hecsDebt;
      }
      const result = borrowingPowerCalculator.calculate(inputs);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Calculation failed', message: err.message });
    }
  }
);

// POST /api/calculators/rent-vs-buy/calculate
router.post(
  '/rent-vs-buy/calculate',
  [
    marketQueryValidator,
    body('purchasePrice').isInt({ min: 0 }).withMessage('purchasePrice must be a non-negative integer (cents)'),
    body('weeklyRent').isInt({ min: 0 }).withMessage('weeklyRent must be a non-negative integer (cents)'),
    body('availableDeposit').isInt({ min: 0 }).withMessage('availableDeposit must be a non-negative integer (cents)'),
    body('mortgageRate').isFloat({ min: 0, max: 100 }).withMessage('mortgageRate must be between 0 and 100'),
    body('loanTermYears').optional().isInt({ min: 1, max: 50 }).withMessage('loanTermYears must be between 1 and 50'),
    body('propertyGrowthRate').optional().isFloat({ min: 0, max: 100 }).withMessage('propertyGrowthRate must be between 0 and 100'),
    body('rentIncreaseRate').optional().isFloat({ min: 0, max: 100 }).withMessage('rentIncreaseRate must be between 0 and 100'),
    body('investmentReturnRate').optional().isFloat({ min: 0, max: 100 }).withMessage('investmentReturnRate must be between 0 and 100'),
  ],
  (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const market = getMarket(req);
      const result = rentVsBuyCalculator.calculate({ ...req.body, market });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Calculation failed', message: err.message });
    }
  }
);

// POST /api/calculators/buying-costs/calculate
// NZ buying costs estimator — legal fees, inspection, valuation, LIM, LEP
router.post(
  '/buying-costs/calculate',
  [
    marketQueryValidator,
    body('propertyPrice').isInt({ min: 0 }).withMessage('propertyPrice must be a non-negative integer (cents)'),
    body('deposit').optional().isInt({ min: 0 }).withMessage('deposit must be a non-negative integer (cents)'),
    body('isNewBuild').optional().isBoolean().withMessage('isNewBuild must be a boolean'),
    body('isInvestment').optional().isBoolean().withMessage('isInvestment must be a boolean'),
  ],
  (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const market = getMarket(req);
    if (market !== 'NZ') {
      return res.status(400).json({
        error: 'buying-costs is only available for the NZ market',
        message: 'For AU use /api/calculators/stamp-duty/calculate. For other markets add ?market=AU|UK|CA|US to the stamp-duty endpoint.',
      });
    }

    try {
      const nzCalculator = loadCalculator('nzBuyingCostsCalculator');
      if (!nzCalculator) return res.status(501).json({ error: 'NZ buying costs calculator not yet available' });
      const result = nzCalculator.calculate(req.body);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Calculation failed', message: err.message });
    }
  }
);

// GET /api/calculators/config/:market/:type
// Returns config data for frontend display — rate tables, last-updated dates, source URLs
const MARKET_CONFIG_FILES = {
  AU: {
    'stamp-duty': 'stampDutyBrackets',
    'transfer-tax': 'stampDutyBrackets',
    mortgage: 'marketDefaults',
    'rental-yield': 'marketDefaults',
    'borrowing-power': 'marketDefaults',
    'rent-vs-buy': 'marketDefaults',
  },
  UK: {
    'stamp-duty': 'ukTransferTax',
    'transfer-tax': 'ukTransferTax',
    mortgage: 'marketDefaults',
    'rental-yield': 'marketDefaults',
    'borrowing-power': 'marketDefaults',
    'rent-vs-buy': 'marketDefaults',
  },
  CA: {
    'stamp-duty': 'caTransferTax',
    'transfer-tax': 'caTransferTax',
    mortgage: 'marketDefaults',
    'rental-yield': 'marketDefaults',
    'borrowing-power': 'marketDefaults',
    'rent-vs-buy': 'marketDefaults',
  },
  US: {
    'stamp-duty': 'usTransferTax',
    'transfer-tax': 'usTransferTax',
    mortgage: 'marketDefaults',
    'rental-yield': 'marketDefaults',
    'borrowing-power': 'marketDefaults',
    'rent-vs-buy': 'marketDefaults',
  },
  NZ: {
    'buying-costs': 'nzBuyingCosts',
    mortgage: 'marketDefaults',
    'rental-yield': 'marketDefaults',
    'borrowing-power': 'marketDefaults',
    'rent-vs-buy': 'marketDefaults',
  },
};

router.get('/config/:market/:type', (req, res) => {
  const market = req.params.market.toUpperCase();
  const type = req.params.type.toLowerCase();

  if (!SUPPORTED_MARKETS.includes(market)) {
    return res.status(400).json({
      error: `Unsupported market: ${market}. Must be one of: ${SUPPORTED_MARKETS.join(', ')}`,
    });
  }

  const marketConfigs = MARKET_CONFIG_FILES[market];
  if (!marketConfigs || !(type in marketConfigs)) {
    const available = marketConfigs ? Object.keys(marketConfigs).join(', ') : 'none';
    return res.status(400).json({
      error: `Unknown config type '${type}' for market '${market}'. Available: ${available}`,
    });
  }

  const configFileName = marketConfigs[type];
  const configPath = path.join(__dirname, '../../config/calculators', `${configFileName}.json`);

  try {
    const data = require(configPath);
    return res.json({ market, type, data });
  } catch {
    return res.status(404).json({
      error: `Config not found for market=${market} type=${type}`,
    });
  }
});

module.exports = router;
