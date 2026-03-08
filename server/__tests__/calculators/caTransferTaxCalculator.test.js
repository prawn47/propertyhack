import { createRequire } from 'module';

const _require = createRequire(import.meta.url);
const { calculate } = _require('../../calculators/caTransferTaxCalculator.js');

describe('caTransferTaxCalculator', () => {
  // ─── Ontario ───────────────────────────────────────────────────────────────

  describe('Ontario standard – $500K', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 500000, province: 'ON', buyerType: 'standard', isResident: true });
    });

    it('computes correct provincial tax', () => {
      // 55000×0.005 + 195000×0.01 + 150000×0.015 + 100000×0.02
      // = 275 + 1950 + 2250 + 2000 = 6475
      expect(result.provincialTax).toBe(6475);
    });

    it('has no municipal tax outside Toronto', () => {
      expect(result.municipalTax).toBe(0);
    });

    it('has no rebate for standard buyer', () => {
      expect(result.firstTimeBuyerRebate).toBe(0);
    });

    it('netTax equals provincialTax', () => {
      expect(result.netTax).toBe(6475);
    });

    it('has hasLTT=true', () => {
      expect(result.hasLTT).toBe(true);
    });

    it('taxLabel is Land Transfer Tax', () => {
      expect(result.taxLabel).toBe('Land Transfer Tax');
    });
  });

  describe('Ontario + Toronto – $800K (dual LTT)', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 800000, province: 'ON', city: 'Toronto', buyerType: 'standard', isResident: true });
    });

    it('computes correct provincial tax', () => {
      // 275 + 1950 + 2250 + 8000 = 12475
      expect(result.provincialTax).toBe(12475);
    });

    it('computes correct municipal LTT (same brackets as provincial)', () => {
      expect(result.municipalTax).toBe(12475);
    });

    it('totalTax is sum of both', () => {
      expect(result.totalTax).toBe(24950);
    });

    it('effectiveRate is based on netTax', () => {
      expect(result.effectiveRate).toBeCloseTo(3.11875, 3);
    });
  });

  describe('Ontario FTB – $500K', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 500000, province: 'ON', buyerType: 'first_time', isResident: true });
    });

    it('applies $4,000 provincial rebate', () => {
      expect(result.firstTimeBuyerRebate).toBe(4000);
    });

    it('netTax is provincialTax minus rebate', () => {
      expect(result.netTax).toBe(2475); // 6475 - 4000
    });

    it('sets eligibilityNote', () => {
      expect(result.eligibilityNote).toBeTruthy();
    });
  });

  describe('Ontario FTB + Toronto – $800K', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 800000, province: 'ON', city: 'Toronto', buyerType: 'first_time', isResident: true });
    });

    it('applies $4,000 provincial + $4,475 Toronto municipal rebate', () => {
      expect(result.firstTimeBuyerRebate).toBe(8475); // 4000 + 4475
    });
  });

  describe('Ontario non-resident – $500K', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 500000, province: 'ON', buyerType: 'standard', isResident: false });
    });

    it('applies 25% NRST on property price', () => {
      expect(result.nonResidentTax).toBe(125000);
    });

    it('totalTax includes both provincial and NRST', () => {
      expect(result.totalTax).toBe(131475); // 6475 + 125000
    });
  });

  // ─── British Columbia ──────────────────────────────────────────────────────

  describe('BC standard – $1M', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 1000000, province: 'BC', buyerType: 'standard', isResident: true });
    });

    it('computes correct provincial tax', () => {
      // 200000×0.01 + 800000×0.02 = 2000 + 16000 = 18000
      expect(result.provincialTax).toBe(18000);
    });

    it('has no rebate for standard buyer', () => {
      expect(result.firstTimeBuyerRebate).toBe(0);
    });
  });

  describe('BC FTB – $800K (full exemption under $835K)', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 800000, province: 'BC', buyerType: 'first_time', isResident: true });
    });

    it('grants full rebate equal to tax', () => {
      // tax = 200000×0.01 + 600000×0.02 = 2000 + 12000 = 14000
      expect(result.provincialTax).toBe(14000);
      expect(result.firstTimeBuyerRebate).toBe(14000);
    });

    it('netTax is 0', () => {
      expect(result.netTax).toBe(0);
    });
  });

  describe('BC FTB – $850K (partial exemption between $835K–$860K)', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 850000, province: 'BC', buyerType: 'first_time', isResident: true });
    });

    it('grants partial rebate', () => {
      // tax = 200000×0.01 + 650000×0.02 = 2000 + 13000 = 15000
      // fraction = 1 - (850000-835000)/(860000-835000) = 1 - 15000/25000 = 0.4
      // rebate = 15000 × 0.4 = 6000
      expect(result.provincialTax).toBe(15000);
      expect(result.firstTimeBuyerRebate).toBe(6000);
      expect(result.netTax).toBe(9000);
    });
  });

  describe('BC non-resident – $1M (foreign buyer tax)', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 1000000, province: 'BC', buyerType: 'standard', isResident: false });
    });

    it('applies 20% foreign buyer tax', () => {
      expect(result.foreignBuyerTax).toBe(200000);
    });

    it('totalTax includes provincial + foreign buyer tax', () => {
      expect(result.totalTax).toBe(218000); // 18000 + 200000
    });
  });

  // ─── Alberta ───────────────────────────────────────────────────────────────

  describe('Alberta – $500K (no LTT, flat fee)', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 500000, province: 'AB', buyerType: 'standard', isResident: true });
    });

    it('has hasLTT=false', () => {
      expect(result.hasLTT).toBe(false);
    });

    it('computes title transfer fee correctly', () => {
      // ceil(500000/5000) = 100 units; 50 + 100×5 = 550
      expect(result.provincialTax).toBe(550);
    });

    it('has no mortgage fee when mortgageAmount not provided', () => {
      expect(result.municipalTax).toBe(0);
    });
  });

  describe('Alberta – $500K with $400K mortgage', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 500000, province: 'AB', buyerType: 'standard', isResident: true, mortgageAmount: 400000 });
    });

    it('computes mortgage registration fee', () => {
      // ceil(400000/5000) = 80 units; 50 + 80×5 = 450
      expect(result.municipalTax).toBe(450);
    });

    it('totalTax is title fee + mortgage fee', () => {
      expect(result.totalTax).toBe(1000); // 550 + 450
    });
  });

  // ─── Saskatchewan ──────────────────────────────────────────────────────────

  describe('Saskatchewan – $500K (0.3% flat fee)', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 500000, province: 'SK', buyerType: 'standard', isResident: true });
    });

    it('has hasLTT=false', () => {
      expect(result.hasLTT).toBe(false);
    });

    it('computes 0.3% fee correctly', () => {
      expect(result.provincialTax).toBe(1500);
    });
  });

  // ─── Quebec + Montreal ─────────────────────────────────────────────────────

  describe('Quebec standard (outside Montreal) – $500K', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 500000, province: 'QC', buyerType: 'standard', isResident: true });
    });

    it('uses provincial brackets', () => {
      // 55200×0.005=276, 221000×0.01=2210, 223800×0.015=3357 → 5843
      expect(result.provincialTax).toBe(5843);
    });

    it('has no municipal tax outside Montreal', () => {
      expect(result.municipalTax).toBe(0);
    });
  });

  describe('Quebec + Montreal – $500K (higher brackets)', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 500000, province: 'QC', city: 'Montreal', buyerType: 'standard', isResident: true });
    });

    it('uses Montreal higher brackets and sets municipalTax', () => {
      // Montreal: 55200×0.005=276, 221000×0.01=2210, 223800×0.015=3357 → 5843
      // (Montreal adds more brackets above 276200)
      expect(result.municipalTax).toBeGreaterThan(0);
    });

    it('provincialTax is 0 (Montreal replaces provincial)', () => {
      expect(result.provincialTax).toBe(0);
    });

    it('Montreal bracket at $500K: 276 + 2210 + 3357 = 5843', () => {
      // At $500K we only hit first 3 Montreal brackets (same as base QC up to 276200, then 1.5% to 552800)
      expect(result.municipalTax).toBe(5843);
    });
  });

  describe('Quebec + Montreal – $1.5M (reaches higher Montreal brackets)', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 1500000, province: 'QC', city: 'Montreal', buyerType: 'standard', isResident: true });
    });

    it('applies 2% bracket above $552,800', () => {
      // 55200×0.005=276, 221000×0.01=2210, 276600×0.015=4149, 552900×0.02=11058, 394300×0.025=9857.5
      // = 276 + 2210 + 4149 + 11058 + 9857.5 = 27550.5
      expect(result.municipalTax).toBeCloseTo(27550.5, 1);
    });
  });

  // ─── Manitoba ──────────────────────────────────────────────────────────────

  describe('Manitoba – $300K', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 300000, province: 'MB', buyerType: 'standard', isResident: true });
    });

    it('computes progressive tax correctly', () => {
      // 0-30K=0, 30K-90K=60000×0.005=300, 90K-150K=60000×0.01=600, 150K-200K=50000×0.015=750, 200K-300K=100000×0.02=2000
      // Total = 3650
      expect(result.provincialTax).toBe(3650);
    });
  });

  // ─── Newfoundland ──────────────────────────────────────────────────────────

  describe('Newfoundland – $300K', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 300000, province: 'NL', buyerType: 'standard', isResident: true });
    });

    it('has hasLTT=false', () => {
      expect(result.hasLTT).toBe(false);
    });

    it('computes $100 + $0.40 per $100 over $500', () => {
      // over = 300000 - 500 = 299500
      // fee = 100 + 299500 × 0.004 = 100 + 1198 = 1298
      expect(result.provincialTax).toBe(1298);
    });
  });

  // ─── PEI ───────────────────────────────────────────────────────────────────

  describe('PEI FTB – $300K', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 300000, province: 'PE', buyerType: 'first_time', isResident: true });
    });

    it('charges 1% flat tax', () => {
      expect(result.provincialTax).toBe(3000);
    });

    it('grants full rebate for FTB', () => {
      expect(result.firstTimeBuyerRebate).toBe(3000);
      expect(result.netTax).toBe(0);
    });
  });

  // ─── Territories ───────────────────────────────────────────────────────────

  describe('Yukon – small registration fee', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 500000, province: 'YT', buyerType: 'standard', isResident: true });
    });

    it('has hasLTT=false', () => {
      expect(result.hasLTT).toBe(false);
    });

    it('charges estimated fee of $50', () => {
      expect(result.provincialTax).toBe(50);
    });
  });

  describe('Northwest Territories – small registration fee', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 500000, province: 'NT', buyerType: 'standard', isResident: true });
    });

    it('charges estimated fee of $50', () => {
      expect(result.provincialTax).toBe(50);
    });
  });

  describe('Nunavut – small registration fee', () => {
    let result;
    beforeEach(() => {
      result = calculate({ propertyPrice: 500000, province: 'NU', buyerType: 'standard', isResident: true });
    });

    it('charges estimated fee of $50', () => {
      expect(result.provincialTax).toBe(50);
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────────────

  it('throws on missing propertyPrice', () => {
    expect(() => calculate({ province: 'ON' })).toThrow();
  });

  it('throws on unknown province', () => {
    expect(() => calculate({ propertyPrice: 500000, province: 'XX' })).toThrow('Unknown province: XX');
  });
});
