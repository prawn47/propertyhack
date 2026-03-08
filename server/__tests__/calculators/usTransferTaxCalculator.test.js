import { calculate } from '../../calculators/usTransferTaxCalculator';

describe('usTransferTaxCalculator', () => {
  describe('New York', () => {
    it('calculates state transfer tax at standard rate (0.4%) for properties under $1M (no mansion tax)', () => {
      const result = calculate({ propertyPrice: 500000, state: 'NY' });
      expect(result.stateName).toBe('New York');
      expect(result.hasTransferTax).toBe(true);
      expect(result.stateTransferTax).toBeCloseTo(500000 * 0.004, 0);
    });

    it('applies mansion tax (1%) for $1M property', () => {
      const result = calculate({ propertyPrice: 1000000, state: 'NY' });
      const expectedStateTax = 1000000 * 0.004;
      const expectedMansionTax = 1000000 * 0.01;
      expect(result.stateTransferTax).toBeCloseTo(expectedStateTax + expectedMansionTax, 0);
    });

    it('applies mansion tax (1.25%) for $2M property', () => {
      const result = calculate({ propertyPrice: 2000000, state: 'NY' });
      const expectedStateTax = 2000000 * 0.004;
      const expectedMansionTax = 2000000 * 0.0125;
      expect(result.stateTransferTax).toBeCloseTo(expectedStateTax + expectedMansionTax, 0);
    });

    it('applies high-value surcharge (0.5% total) for properties over $3M', () => {
      const result = calculate({ propertyPrice: 3500000, state: 'NY' });
      const expectedStateTax = 3500000 * 0.005;
      const expectedMansionTax = 3500000 * 0.015;
      expect(result.stateTransferTax).toBeCloseTo(expectedStateTax + expectedMansionTax, 0);
    });

    it('calculates mortgage recording tax on loan amount under $500K', () => {
      const result = calculate({ propertyPrice: 600000, state: 'NY', loanAmount: 400000 });
      const expectedMRT = 400000 * 0.0155;
      expect(result.mortgageRecordingTax).toBeCloseTo(expectedMRT, 0);
    });

    it('calculates mortgage recording tax on loan amount at/above $500K', () => {
      const result = calculate({ propertyPrice: 800000, state: 'NY', loanAmount: 600000 });
      const expectedMRT = 600000 * 0.01675;
      expect(result.mortgageRecordingTax).toBeCloseTo(expectedMRT, 0);
    });

    it('returns $0 mortgage recording tax when no loan amount provided', () => {
      const result = calculate({ propertyPrice: 1000000, state: 'NY' });
      expect(result.mortgageRecordingTax).toBe(0);
    });

    it('returns correct title insurance and closing cost ranges', () => {
      const result = calculate({ propertyPrice: 500000, state: 'NY' });
      expect(result.estimatedTitleInsurance.min).toBeCloseTo(500000 * 0.004, 0);
      expect(result.estimatedTitleInsurance.max).toBeCloseTo(500000 * 0.007, 0);
      expect(result.estimatedTotalClosingCosts.min).toBeCloseTo(500000 * 0.03, 0);
      expect(result.estimatedTotalClosingCosts.max).toBeCloseTo(500000 * 0.07, 0);
    });

    it('defaults whoPays to seller for NY', () => {
      const result = calculate({ propertyPrice: 500000, state: 'NY' });
      expect(result.whoPays).toBe('seller');
    });
  });

  describe('California', () => {
    it('calculates flat percentage transfer tax', () => {
      const result = calculate({ propertyPrice: 750000, state: 'CA' });
      const expected = 750000 * 0.0011;
      expect(result.stateTransferTax).toBeCloseTo(expected, 0);
      expect(result.hasTransferTax).toBe(true);
      expect(result.stateName).toBe('California');
    });

    it('returns no mortgage recording tax for CA', () => {
      const result = calculate({ propertyPrice: 750000, state: 'CA', loanAmount: 500000 });
      expect(result.mortgageRecordingTax).toBe(0);
    });

    it('returns correct effective rate', () => {
      const result = calculate({ propertyPrice: 1000000, state: 'CA' });
      expect(result.effectiveRate).toBeCloseTo(0.11, 2);
    });

    it('defaults whoPays to seller for CA', () => {
      const result = calculate({ propertyPrice: 500000, state: 'CA' });
      expect(result.whoPays).toBe('seller');
    });

    it('allows overriding whoPays', () => {
      const result = calculate({ propertyPrice: 500000, state: 'CA', whoPays: 'buyer' });
      expect(result.whoPays).toBe('buyer');
    });
  });

  describe('Texas (no transfer tax)', () => {
    it('returns $0 state transfer tax', () => {
      const result = calculate({ propertyPrice: 500000, state: 'TX' });
      expect(result.stateTransferTax).toBe(0);
      expect(result.hasTransferTax).toBe(false);
      expect(result.stateName).toBe('Texas');
    });

    it('still returns estimated title insurance and closing costs', () => {
      const result = calculate({ propertyPrice: 400000, state: 'TX' });
      expect(result.estimatedTitleInsurance.min).toBeGreaterThan(0);
      expect(result.estimatedTitleInsurance.max).toBeGreaterThan(0);
      expect(result.estimatedTotalClosingCosts.min).toBeGreaterThan(0);
      expect(result.estimatedTotalClosingCosts.max).toBeGreaterThan(0);
    });

    it('returns effective rate of 0', () => {
      const result = calculate({ propertyPrice: 500000, state: 'TX' });
      expect(result.effectiveRate).toBe(0);
    });

    it('returns $0 mortgage recording tax', () => {
      const result = calculate({ propertyPrice: 500000, state: 'TX', loanAmount: 400000 });
      expect(result.mortgageRecordingTax).toBe(0);
    });

    it('includes disclaimer', () => {
      const result = calculate({ propertyPrice: 300000, state: 'TX' });
      expect(result.disclaimer).toBeTruthy();
      expect(typeof result.disclaimer).toBe('string');
    });
  });

  describe('Florida', () => {
    it('calculates flat documentary stamp tax at 0.7%', () => {
      const result = calculate({ propertyPrice: 400000, state: 'FL' });
      const expected = 400000 * 0.007;
      expect(result.stateTransferTax).toBeCloseTo(expected, 0);
      expect(result.hasTransferTax).toBe(true);
      expect(result.stateName).toBe('Florida');
    });

    it('calculates mortgage recording tax at 0.35% of loan amount', () => {
      const result = calculate({ propertyPrice: 500000, state: 'FL', loanAmount: 400000 });
      const expectedMRT = 400000 * 0.0035;
      expect(result.mortgageRecordingTax).toBeCloseTo(expectedMRT, 0);
    });

    it('returns $0 mortgage recording tax when no loan provided', () => {
      const result = calculate({ propertyPrice: 500000, state: 'FL' });
      expect(result.mortgageRecordingTax).toBe(0);
    });

    it('defaults whoPays to seller for FL', () => {
      const result = calculate({ propertyPrice: 400000, state: 'FL' });
      expect(result.whoPays).toBe('seller');
    });
  });

  describe('District of Columbia (first-time buyer exemption)', () => {
    it('calculates standard transfer taxes for regular buyer', () => {
      const result = calculate({ propertyPrice: 400000, state: 'DC', buyerType: 'standard' });
      expect(result.hasTransferTax).toBe(true);
      expect(result.stateName).toBe('District of Columbia');
      expect(result.stateTransferTax).toBeGreaterThan(0);
    });

    it('applies first-time buyer recordation tax exemption for properties under $625K', () => {
      const resultStandard = calculate({ propertyPrice: 400000, state: 'DC', buyerType: 'standard' });
      const resultFTB = calculate({ propertyPrice: 400000, state: 'DC', buyerType: 'first_time' });
      expect(resultFTB.firstTimeBuyerExemption).toBeGreaterThan(0);
      expect(resultFTB.stateTransferTax).toBeLessThan(resultStandard.stateTransferTax);
    });

    it('does not apply first-time buyer exemption for properties $625K and above', () => {
      const result = calculate({ propertyPrice: 700000, state: 'DC', buyerType: 'first_time' });
      expect(result.firstTimeBuyerExemption).toBe(0);
    });

    it('returns $0 first-time buyer exemption for standard buyer', () => {
      const result = calculate({ propertyPrice: 400000, state: 'DC', buyerType: 'standard' });
      expect(result.firstTimeBuyerExemption).toBe(0);
    });

    it('defaults whoPays to split for DC', () => {
      const result = calculate({ propertyPrice: 400000, state: 'DC' });
      expect(result.whoPays).toBe('split');
    });
  });

  describe('Washington (graduated REET)', () => {
    it('calculates graduated REET for property under $525K', () => {
      const result = calculate({ propertyPrice: 400000, state: 'WA' });
      const expected = 400000 * 0.011;
      expect(result.stateTransferTax).toBeCloseTo(expected, 0);
      expect(result.stateName).toBe('Washington');
    });

    it('calculates graduated REET across two brackets ($600K spans first two bands)', () => {
      const result = calculate({ propertyPrice: 600000, state: 'WA' });
      const tier1 = 525000 * 0.011;
      const tier2 = (600000 - 525000) * 0.0128;
      expect(result.stateTransferTax).toBeCloseTo(tier1 + tier2, 0);
    });

    it('calculates graduated REET across three brackets ($2M)', () => {
      const result = calculate({ propertyPrice: 2000000, state: 'WA' });
      const tier1 = 525000 * 0.011;
      const tier2 = (1525000 - 525001) * 0.0128;
      const tier3 = (2000000 - 1525001) * 0.0275;
      expect(result.stateTransferTax).toBeCloseTo(tier1 + tier2 + tier3, -1);
    });

    it('defaults whoPays to seller for WA', () => {
      const result = calculate({ propertyPrice: 400000, state: 'WA' });
      expect(result.whoPays).toBe('seller');
    });

    it('returns no mortgage recording tax for WA', () => {
      const result = calculate({ propertyPrice: 400000, state: 'WA', loanAmount: 300000 });
      expect(result.mortgageRecordingTax).toBe(0);
    });
  });

  describe('Input validation', () => {
    it('throws for unknown state', () => {
      expect(() => calculate({ propertyPrice: 500000, state: 'XX' })).toThrow('Unknown state');
    });

    it('throws when state is missing', () => {
      expect(() => calculate({ propertyPrice: 500000 })).toThrow('state is required');
    });

    it('throws for negative property price', () => {
      expect(() => calculate({ propertyPrice: -100, state: 'CA' })).toThrow();
    });

    it('handles $0 property price without dividing by zero', () => {
      expect(() => calculate({ propertyPrice: 0, state: 'CA' })).toThrow();
    });
  });

  describe('Fixed rate (Arizona)', () => {
    it('returns flat $2 fee for AZ', () => {
      const result = calculate({ propertyPrice: 500000, state: 'AZ' });
      expect(result.stateTransferTax).toBe(2);
      expect(result.hasTransferTax).toBe(true);
      expect(result.stateName).toBe('Arizona');
    });
  });

  describe('Return structure', () => {
    it('always includes all required output fields', () => {
      const result = calculate({ propertyPrice: 500000, state: 'CA' });
      expect(result).toHaveProperty('stateTransferTax');
      expect(result).toHaveProperty('mortgageRecordingTax');
      expect(result).toHaveProperty('estimatedTitleInsurance');
      expect(result.estimatedTitleInsurance).toHaveProperty('min');
      expect(result.estimatedTitleInsurance).toHaveProperty('max');
      expect(result).toHaveProperty('estimatedTotalClosingCosts');
      expect(result.estimatedTotalClosingCosts).toHaveProperty('min');
      expect(result.estimatedTotalClosingCosts).toHaveProperty('max');
      expect(result).toHaveProperty('effectiveRate');
      expect(result).toHaveProperty('hasTransferTax');
      expect(result).toHaveProperty('whoPays');
      expect(result).toHaveProperty('stateName');
      expect(result).toHaveProperty('disclaimer');
      expect(result).toHaveProperty('firstTimeBuyerExemption');
    });
  });
});
