const mortgageCalculator = require('../calculators/mortgageCalculator');
const borrowingPowerCalculator = require('../calculators/borrowingPowerCalculator');
const stampDutyCalculator = require('../calculators/stampDutyCalculator');
const rentalYieldCalculator = require('../calculators/rentalYieldCalculator');
const rentVsBuyCalculator = require('../calculators/rentVsBuyCalculator');
const nzBuyingCostsCalculator = require('../calculators/nzBuyingCostsCalculator');

const toolDeclarations = [
  {
    name: 'calculate_mortgage',
    description:
      'Calculate mortgage repayments for a property loan. Use when a user asks about repayments, monthly payments, or what a loan on a given property would cost.',
    parameters: {
      type: 'object',
      properties: {
        propertyPrice: {
          type: 'integer',
          description: 'Property price in cents (e.g. $600,000 = 60000000). Convert dollar amounts to cents.',
        },
        deposit: {
          type: 'integer',
          description: 'Deposit amount in cents (e.g. $120,000 = 12000000). If not provided, defaults to 20% of property price.',
        },
        depositPercent: {
          type: 'number',
          description: 'Deposit as a percentage of property price (e.g. 20 for 20%). Used if deposit cents not provided.',
        },
        interestRate: {
          type: 'number',
          description: 'Annual interest rate as a percentage (e.g. 6.5 for 6.5%). Defaults to market default if omitted.',
        },
        loanTermYears: {
          type: 'integer',
          description: 'Loan term in years (e.g. 30). Defaults to market standard.',
        },
        repaymentType: {
          type: 'string',
          enum: ['PI', 'IO'],
          description: 'PI = principal and interest (default), IO = interest only.',
        },
        frequency: {
          type: 'string',
          enum: ['monthly', 'fortnightly', 'weekly', 'bi-weekly', 'accelerated-bi-weekly'],
          description: 'Repayment frequency. Defaults to monthly.',
        },
        market: {
          type: 'string',
          enum: ['AU', 'US', 'UK', 'CA', 'NZ'],
          description: 'Property market. Defaults to user\'s preferred market or AU.',
        },
      },
      required: ['propertyPrice'],
    },
  },
  {
    name: 'calculate_borrowing_power',
    description:
      'Estimate how much someone can borrow based on their income, expenses, and debts. Use when a user asks how much they can borrow, afford, or their borrowing capacity.',
    parameters: {
      type: 'object',
      properties: {
        grossIncome1: {
          type: 'integer',
          description: 'Primary applicant gross annual income in cents (e.g. $100,000/yr = 10000000). Convert dollar amounts to cents.',
        },
        grossIncome2: {
          type: 'integer',
          description: 'Second applicant gross annual income in cents. Omit or use 0 if single applicant.',
        },
        otherIncome: {
          type: 'integer',
          description: 'Other annual income (rental, investment etc.) in cents.',
        },
        applicants: {
          type: 'integer',
          description: 'Number of applicants: 1 or 2.',
        },
        monthlyLivingExpenses: {
          type: 'integer',
          description: 'Declared monthly living expenses in cents.',
        },
        creditCardLimits: {
          type: 'integer',
          description: 'Total credit card limit(s) in cents. Lenders use 3% of limit as a monthly commitment.',
        },
        existingLoanRepayments: {
          type: 'integer',
          description: 'Total existing monthly loan repayments in cents (car loans, personal loans, etc.).',
        },
        studentDebt: {
          type: 'integer',
          description: 'Student debt balance in cents for AU/NZ; monthly payment in cents for US/CA. For UK, use 1 if the applicant has a student loan.',
        },
        dependants: {
          type: 'integer',
          description: 'Number of financial dependants (children etc.).',
        },
        assessmentRate: {
          type: 'number',
          description: 'Loan assessment rate as a percentage. Leave blank to use market default stress-test rate.',
        },
        market: {
          type: 'string',
          enum: ['AU', 'US', 'UK', 'CA', 'NZ'],
          description: 'Property market. Defaults to user\'s preferred market or AU.',
        },
      },
      required: ['grossIncome1'],
    },
  },
  {
    name: 'calculate_stamp_duty',
    description:
      'Calculate Australian stamp duty (transfer duty) for a property purchase. Use when a user asks about stamp duty, transfer duty, or upfront costs for an Australian property. Only covers Australian states/territories.',
    parameters: {
      type: 'object',
      properties: {
        propertyPrice: {
          type: 'integer',
          description: 'Property purchase price in cents (e.g. $700,000 = 70000000). Convert dollar amounts to cents.',
        },
        state: {
          type: 'string',
          enum: ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'],
          description: 'Australian state or territory abbreviation.',
        },
        buyerType: {
          type: 'string',
          enum: ['standard', 'firstHomeBuyer', 'foreign'],
          description: 'Buyer type. firstHomeBuyer may qualify for exemptions or concessions.',
        },
        propertyType: {
          type: 'string',
          enum: ['established', 'new', 'land'],
          description: 'Property type. Defaults to established.',
        },
        primaryResidence: {
          type: 'boolean',
          description: 'Whether the property will be a primary residence (owner-occupied). Defaults to true.',
        },
        vicOffThePlan: {
          type: 'boolean',
          description: 'VIC only: whether this is an off-the-plan purchase. Duty is calculated on land component only.',
        },
      },
      required: ['propertyPrice', 'state'],
    },
  },
  {
    name: 'calculate_rental_yield',
    description:
      'Calculate gross and net rental yield for an investment property. Use when a user asks about rental yield, return on a property, whether a rental return is good, or how much a property earns.',
    parameters: {
      type: 'object',
      properties: {
        purchasePrice: {
          type: 'integer',
          description: 'Property purchase price in cents (e.g. $500,000 = 50000000). Convert dollar amounts to cents.',
        },
        weeklyRent: {
          type: 'integer',
          description: 'Weekly rent in cents for AU/NZ markets (e.g. $450/week = 45000). Use this for AU and NZ.',
        },
        monthlyRent: {
          type: 'integer',
          description: 'Monthly rent in cents for US/UK/CA markets (e.g. $2,000/month = 200000). Use this for US, UK, CA.',
        },
        rentFrequency: {
          type: 'string',
          enum: ['weekly', 'monthly'],
          description: 'Whether rent is weekly or monthly. Defaults to weekly for AU/NZ, monthly for others.',
        },
        managementFeeRate: {
          type: 'number',
          description: 'Property management fee as a percentage of annual rent (e.g. 8 for 8%). Defaults to market standard.',
        },
        councilRates: {
          type: 'integer',
          description: 'Annual council rates / property tax in cents.',
        },
        strataFees: {
          type: 'integer',
          description: 'Annual strata / body corporate / HOA fees in cents.',
        },
        insurance: {
          type: 'integer',
          description: 'Annual landlord insurance in cents.',
        },
        maintenance: {
          type: 'integer',
          description: 'Annual maintenance and repairs estimate in cents.',
        },
      },
      required: ['purchasePrice'],
    },
  },
  {
    name: 'calculate_rent_vs_buy',
    description:
      'Compare the financial outcome of renting vs buying a property over time. Use when a user asks whether to rent or buy, which is better financially, or wants a long-term comparison.',
    parameters: {
      type: 'object',
      properties: {
        purchasePrice: {
          type: 'integer',
          description: 'Property purchase price in cents (e.g. $800,000 = 80000000). Convert dollar amounts to cents.',
        },
        availableDeposit: {
          type: 'integer',
          description: 'Available deposit in cents (e.g. $160,000 = 16000000). Convert dollar amounts to cents.',
        },
        weeklyRent: {
          type: 'integer',
          description: 'Current weekly rent (AU/NZ) or monthly rent (US/UK/CA) in cents as an alternative to buying.',
        },
        mortgageRate: {
          type: 'number',
          description: 'Annual mortgage interest rate as a percentage (e.g. 6.5).',
        },
        loanTermYears: {
          type: 'integer',
          description: 'Loan term in years for the comparison (default 30).',
        },
        propertyGrowthRate: {
          type: 'number',
          description: 'Expected annual property price growth as a percentage (e.g. 5). Defaults to market average.',
        },
        rentIncreaseRate: {
          type: 'number',
          description: 'Expected annual rent increase as a percentage (e.g. 3). Defaults to market average.',
        },
        investmentReturnRate: {
          type: 'number',
          description: 'Expected annual investment return if renting and investing the difference (e.g. 7). Defaults to market average.',
        },
        market: {
          type: 'string',
          enum: ['AU', 'US', 'UK', 'CA', 'NZ'],
          description: 'Property market. Defaults to user\'s preferred market or AU.',
        },
      },
      required: ['purchasePrice', 'availableDeposit', 'weeklyRent'],
    },
  },
  {
    name: 'calculate_buying_costs',
    description:
      'Calculate the total upfront buying costs for a New Zealand property purchase (legal fees, inspection, valuation, LIM report, low equity premium). Use for NZ buying cost questions. For Australian stamp duty use calculate_stamp_duty instead.',
    parameters: {
      type: 'object',
      properties: {
        propertyPrice: {
          type: 'integer',
          description: 'Property purchase price in cents (e.g. $700,000 = 70000000). Convert dollar amounts to cents.',
        },
        buyerType: {
          type: 'string',
          enum: ['owner_occupier', 'investor'],
          description: 'Whether the buyer intends to live in the property or rent it out.',
        },
        firstHomeBuyer: {
          type: 'boolean',
          description: 'Whether the buyer is a first home buyer (affects low equity premium calculation).',
        },
        depositPercentage: {
          type: 'number',
          description: 'Deposit as a percentage of purchase price (e.g. 20 for 20%). Defaults to 20%.',
        },
        newBuild: {
          type: 'boolean',
          description: 'Whether the property is a new build (affects GST notes).',
        },
      },
      required: ['propertyPrice'],
    },
  },
];

function getToolDeclarations() {
  return toolDeclarations.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

const MARKET_DEFAULTS = {
  AU: { interestRate: 6.5, loanTermYears: 30 },
  US: { interestRate: 7.0, loanTermYears: 30 },
  UK: { interestRate: 4.5, loanTermYears: 25 },
  CA: { interestRate: 5.5, loanTermYears: 25 },
  NZ: { interestRate: 6.5, loanTermYears: 30 },
};

async function executeToolCall(name, args, userPrefs = {}) {
  try {
    const market = (args.market || userPrefs.defaultCountry || 'AU').toUpperCase();
    const mktDefaults = MARKET_DEFAULTS[market] || MARKET_DEFAULTS['AU'];

    if (name === 'calculate_mortgage') {
      const propertyPrice = args.propertyPrice;
      let deposit;
      if (args.deposit != null) {
        deposit = args.deposit;
      } else if (args.depositPercent != null) {
        deposit = Math.round(propertyPrice * args.depositPercent / 100);
      } else {
        deposit = Math.round(propertyPrice * 0.20);
      }

      const inputs = {
        propertyPrice,
        deposit,
        loanTermYears: args.loanTermYears || mktDefaults.loanTermYears,
        interestRate: args.interestRate || mktDefaults.interestRate,
        repaymentType: args.repaymentType || 'PI',
        frequency: args.frequency || 'monthly',
        market,
      };

      const result = mortgageCalculator.calculate(inputs);
      return { type: 'mortgage', inputs, result };
    }

    if (name === 'calculate_borrowing_power') {
      const inputs = {
        market,
        applicants: args.applicants || 1,
        grossIncome1: args.grossIncome1 || 0,
        grossIncome2: args.grossIncome2 || 0,
        otherIncome: args.otherIncome || 0,
        monthlyLivingExpenses: args.monthlyLivingExpenses || 0,
        creditCardLimits: args.creditCardLimits || 0,
        existingLoanRepayments: args.existingLoanRepayments || 0,
        studentDebt: args.studentDebt || 0,
        dependants: args.dependants || 0,
      };

      if (args.assessmentRate != null) {
        inputs.assessmentRate = args.assessmentRate;
      }

      const result = borrowingPowerCalculator.calculate(inputs);
      return { type: 'borrowingPower', inputs, result };
    }

    if (name === 'calculate_stamp_duty') {
      const inputs = {
        propertyPrice: args.propertyPrice,
        state: args.state || 'NSW',
        buyerType: args.buyerType || 'standard',
        propertyType: args.propertyType || 'established',
        primaryResidence: args.primaryResidence !== false,
        vicOffThePlan: args.vicOffThePlan || false,
      };

      const result = stampDutyCalculator.calculate(inputs);
      return { type: 'stampDuty', inputs, result };
    }

    if (name === 'calculate_rental_yield') {
      const inputs = {
        purchasePrice: args.purchasePrice,
        rentFrequency: args.rentFrequency || 'weekly',
        managementFeeRate: args.managementFeeRate || 7,
        councilRates: args.councilRates || 0,
        strataFees: args.strataFees || 0,
        insurance: args.insurance || 0,
        maintenance: args.maintenance || 0,
        landTax: args.landTax || 0,
        groundRent: args.groundRent || 0,
        propertyTax: args.propertyTax || 0,
        otherExpenses: args.otherExpenses || 0,
      };

      if (args.weeklyRent != null) {
        inputs.weeklyRent = args.weeklyRent;
      } else if (args.monthlyRent != null) {
        inputs.monthlyRent = args.monthlyRent;
        inputs.rentFrequency = 'monthly';
      }

      const result = rentalYieldCalculator.calculate(inputs);
      return { type: 'rentalYield', inputs, result };
    }

    if (name === 'calculate_rent_vs_buy') {
      const inputs = {
        purchasePrice: args.purchasePrice,
        availableDeposit: args.availableDeposit,
        weeklyRent: args.weeklyRent || 0,
        mortgageRate: args.mortgageRate || mktDefaults.interestRate,
        loanTermYears: args.loanTermYears || mktDefaults.loanTermYears,
        market,
      };

      if (args.propertyGrowthRate != null) inputs.propertyGrowthRate = args.propertyGrowthRate;
      if (args.rentIncreaseRate != null) inputs.rentIncreaseRate = args.rentIncreaseRate;
      if (args.investmentReturnRate != null) inputs.investmentReturnRate = args.investmentReturnRate;

      const result = rentVsBuyCalculator.calculate(inputs);
      return { type: 'rentVsBuy', inputs, result };
    }

    if (name === 'calculate_buying_costs') {
      const inputs = {
        propertyPrice: args.propertyPrice,
        buyerType: args.buyerType || 'owner_occupier',
        firstHomeBuyer: args.firstHomeBuyer || false,
        depositPercentage: args.depositPercentage != null ? args.depositPercentage : 20,
        newBuild: args.newBuild || false,
      };

      const result = nzBuyingCostsCalculator.calculate(inputs);
      return { type: 'buyingCosts', inputs, result };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (err) {
    return { error: err.message || 'Calculator error', tool: name };
  }
}

module.exports = { getToolDeclarations, executeToolCall };
