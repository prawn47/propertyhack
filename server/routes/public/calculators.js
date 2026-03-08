'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const mortgageCalculator = require('../../calculators/mortgageCalculator');
const stampDutyCalculator = require('../../calculators/stampDutyCalculator');
const rentalYieldCalculator = require('../../calculators/rentalYieldCalculator');
const borrowingPowerCalculator = require('../../calculators/borrowingPowerCalculator');
const rentVsBuyCalculator = require('../../calculators/rentVsBuyCalculator');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  return null;
}

// POST /api/calculators/mortgage/calculate
router.post(
  '/mortgage/calculate',
  [
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
      const result = mortgageCalculator.calculate(req.body);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Calculation failed', message: err.message });
    }
  }
);

// POST /api/calculators/stamp-duty/calculate
router.post(
  '/stamp-duty/calculate',
  [
    body('propertyPrice').isInt({ min: 0 }).withMessage('propertyPrice must be a non-negative integer (cents)'),
    body('state').isIn(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']).withMessage('state must be a valid Australian state or territory'),
    body('buyerType').isIn(['firstHomeBuyer', 'standard', 'foreign']).withMessage('buyerType must be firstHomeBuyer, standard, or foreign'),
    body('propertyType').isIn(['established', 'new', 'vacant_land']).withMessage('propertyType must be established, new, or vacant_land'),
    body('primaryResidence').isBoolean().withMessage('primaryResidence must be a boolean'),
    body('vicOffThePlan').optional().isBoolean().withMessage('vicOffThePlan must be a boolean'),
  ],
  (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const inputs = {
        ...req.body,
        vicOffThePlan: req.body.vicOffThePlan ?? false,
      };
      const result = stampDutyCalculator.calculate(inputs);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Calculation failed', message: err.message });
    }
  }
);

// POST /api/calculators/rental-yield/calculate
router.post(
  '/rental-yield/calculate',
  [
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
      const result = rentalYieldCalculator.calculate(req.body);
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
    body('applicants').optional().isInt({ min: 1, max: 2 }).withMessage('applicants must be 1 or 2'),
    body('grossIncome1').isInt({ min: 0 }).withMessage('grossIncome1 must be a non-negative integer (cents)'),
    body('grossIncome2').optional().isInt({ min: 0 }).withMessage('grossIncome2 must be a non-negative integer (cents)'),
    body('otherIncome').optional().isInt({ min: 0 }).withMessage('otherIncome must be a non-negative integer (cents)'),
    body('monthlyLivingExpenses').optional().isInt({ min: 0 }).withMessage('monthlyLivingExpenses must be a non-negative integer (cents)'),
    body('creditCardLimits').optional().isInt({ min: 0 }).withMessage('creditCardLimits must be a non-negative integer (cents)'),
    body('existingLoanRepayments').optional().isInt({ min: 0 }).withMessage('existingLoanRepayments must be a non-negative integer (cents)'),
    body('hecsDebt').optional().isInt({ min: 0 }).withMessage('hecsDebt must be a non-negative integer (cents)'),
    body('dependants').optional().isInt({ min: 0, max: 10 }).withMessage('dependants must be between 0 and 10'),
    body('assessmentRate').optional().isFloat({ min: 0, max: 100 }).withMessage('assessmentRate must be between 0 and 100'),
  ],
  (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const result = borrowingPowerCalculator.calculate(req.body);
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
      const result = rentVsBuyCalculator.calculate(req.body);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Calculation failed', message: err.message });
    }
  }
);

module.exports = router;
