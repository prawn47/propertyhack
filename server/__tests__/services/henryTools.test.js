import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

let getToolDeclarations;
let executeToolCall;

beforeAll(() => {
  const svcPath = _require.resolve('../../services/henryTools.js');
  delete _require.cache[svcPath];
  const svc = _require('../../services/henryTools.js');
  getToolDeclarations = svc.getToolDeclarations;
  executeToolCall = svc.executeToolCall;
});

describe('getToolDeclarations', () => {
  it('returns an array of 6 tools', () => {
    const tools = getToolDeclarations();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools).toHaveLength(6);
  });

  it('every tool has a name', () => {
    const tools = getToolDeclarations();
    for (const tool of tools) {
      expect(typeof tool.name).toBe('string');
      expect(tool.name.length).toBeGreaterThan(0);
    }
  });

  it('every tool has a description', () => {
    const tools = getToolDeclarations();
    for (const tool of tools) {
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it('every tool has a parameters object', () => {
    const tools = getToolDeclarations();
    for (const tool of tools) {
      expect(tool.parameters).toBeDefined();
      expect(typeof tool.parameters).toBe('object');
    }
  });

  it('includes calculate_mortgage tool', () => {
    const tools = getToolDeclarations();
    const names = tools.map(t => t.name);
    expect(names).toContain('calculate_mortgage');
  });

  it('includes calculate_borrowing_power tool', () => {
    const tools = getToolDeclarations();
    const names = tools.map(t => t.name);
    expect(names).toContain('calculate_borrowing_power');
  });

  it('includes calculate_stamp_duty tool', () => {
    const tools = getToolDeclarations();
    const names = tools.map(t => t.name);
    expect(names).toContain('calculate_stamp_duty');
  });

  it('includes calculate_rental_yield tool', () => {
    const tools = getToolDeclarations();
    const names = tools.map(t => t.name);
    expect(names).toContain('calculate_rental_yield');
  });

  it('includes calculate_rent_vs_buy tool', () => {
    const tools = getToolDeclarations();
    const names = tools.map(t => t.name);
    expect(names).toContain('calculate_rent_vs_buy');
  });

  it('includes calculate_buying_costs tool', () => {
    const tools = getToolDeclarations();
    const names = tools.map(t => t.name);
    expect(names).toContain('calculate_buying_costs');
  });
});

describe('executeToolCall — calculate_mortgage', () => {
  it('returns result with type mortgage for valid inputs', async () => {
    const result = await executeToolCall('calculate_mortgage', { propertyPrice: 60000000 });
    expect(result.type).toBe('mortgage');
    expect(result.inputs).toBeDefined();
    expect(result.result).toBeDefined();
  });

  it('defaults deposit to 20% when not provided', async () => {
    const result = await executeToolCall('calculate_mortgage', { propertyPrice: 50000000 });
    expect(result.inputs.deposit).toBe(10000000); // 20% of 50000000
  });

  it('uses depositPercent when provided', async () => {
    const result = await executeToolCall('calculate_mortgage', {
      propertyPrice: 60000000,
      depositPercent: 10,
    });
    expect(result.inputs.deposit).toBe(6000000); // 10% of 60000000
  });

  it('uses explicit deposit when provided', async () => {
    const result = await executeToolCall('calculate_mortgage', {
      propertyPrice: 60000000,
      deposit: 15000000,
    });
    expect(result.inputs.deposit).toBe(15000000);
  });

  it('defaults to AU market when none specified', async () => {
    const result = await executeToolCall('calculate_mortgage', { propertyPrice: 60000000 });
    expect(result.inputs.market).toBe('AU');
  });

  it('uses userPrefs.defaultCountry when no market in args', async () => {
    const result = await executeToolCall(
      'calculate_mortgage',
      { propertyPrice: 60000000 },
      { defaultCountry: 'NZ' }
    );
    expect(result.inputs.market).toBe('NZ');
  });

  it('uses market from args over userPrefs', async () => {
    const result = await executeToolCall(
      'calculate_mortgage',
      { propertyPrice: 60000000, market: 'UK' },
      { defaultCountry: 'AU' }
    );
    expect(result.inputs.market).toBe('UK');
  });

  it('applies AU market interest rate default (6.5)', async () => {
    const result = await executeToolCall('calculate_mortgage', { propertyPrice: 60000000 });
    expect(result.inputs.interestRate).toBe(6.5);
  });

  it('applies UK market interest rate default (4.5)', async () => {
    const result = await executeToolCall('calculate_mortgage', {
      propertyPrice: 60000000,
      market: 'UK',
    });
    expect(result.inputs.interestRate).toBe(4.5);
  });

  it('defaults to monthly repayment frequency', async () => {
    const result = await executeToolCall('calculate_mortgage', { propertyPrice: 60000000 });
    expect(result.inputs.frequency).toBe('monthly');
  });

  it('defaults to PI repayment type', async () => {
    const result = await executeToolCall('calculate_mortgage', { propertyPrice: 60000000 });
    expect(result.inputs.repaymentType).toBe('PI');
  });
});

describe('executeToolCall — calculate_borrowing_power', () => {
  it('returns result with type borrowingPower', async () => {
    const result = await executeToolCall('calculate_borrowing_power', {
      grossIncome1: 12000000,
    });
    expect(result.type).toBe('borrowingPower');
    expect(result.result).toBeDefined();
  });

  it('applies smart default market from userPrefs', async () => {
    const result = await executeToolCall(
      'calculate_borrowing_power',
      { grossIncome1: 10000000 },
      { defaultCountry: 'CA' }
    );
    expect(result.inputs.market).toBe('CA');
  });
});

describe('executeToolCall — calculate_stamp_duty', () => {
  it('returns result with type stampDuty', async () => {
    const result = await executeToolCall('calculate_stamp_duty', {
      propertyPrice: 70000000,
      state: 'NSW',
    });
    expect(result.type).toBe('stampDuty');
    expect(result.result).toBeDefined();
  });

  it('defaults state to NSW when not provided', async () => {
    const result = await executeToolCall('calculate_stamp_duty', {
      propertyPrice: 50000000,
    });
    expect(result.inputs.state).toBe('NSW');
  });
});

describe('executeToolCall — calculate_rental_yield', () => {
  it('returns result with type rentalYield', async () => {
    const result = await executeToolCall('calculate_rental_yield', {
      purchasePrice: 50000000,
      weeklyRent: 45000,
    });
    expect(result.type).toBe('rentalYield');
    expect(result.result).toBeDefined();
  });
});

describe('executeToolCall — calculate_buying_costs', () => {
  it('returns result with type buyingCosts', async () => {
    const result = await executeToolCall('calculate_buying_costs', {
      propertyPrice: 70000000,
    });
    expect(result.type).toBe('buyingCosts');
    expect(result.result).toBeDefined();
  });

  it('defaults depositPercentage to 20', async () => {
    const result = await executeToolCall('calculate_buying_costs', {
      propertyPrice: 70000000,
    });
    expect(result.inputs.depositPercentage).toBe(20);
  });
});

describe('executeToolCall — unknown tool', () => {
  it('returns error object for unknown tool name', async () => {
    const result = await executeToolCall('calculate_unicorn', { foo: 'bar' });
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Unknown tool');
  });
});
