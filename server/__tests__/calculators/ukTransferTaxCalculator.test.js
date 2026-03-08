'use strict';

import { describe, it, expect } from 'vitest';
import { calculate, calculateForRegion } from '../../calculators/ukTransferTaxCalculator.js';

// England standard rates (from 1 April 2025):
// 0%  on first £125,000
// 2%  on £125,001–£250,000  → £2,500 on the full £125K band
// 5%  on £250,001–£925,000  → up to £33,750 on full band
// 10% on £925,001–£1,500,000
// 12% above £1,500,000

describe('England — Standard buyer', () => {
  it('calculates correct SDLT for £500,000 property', () => {
    // £0–125K:       0%  = £0
    // £125K–250K:    2%  = £2,500
    // £250K–500K:    5%  = £12,500
    // Total = £15,000
    const result = calculate({
      propertyPrice: 500000,
      location: 'england',
      buyerType: 'standard',
      ukResident: true,
    });

    expect(result.taxAmount).toBe(15000);
    expect(result.taxName).toBe('Stamp Duty Land Tax');
    expect(result.abbreviation).toBe('SDLT');
    expect(result.effectiveRate).toBe(3);

    const bandAmounts = result.bands.map(b => b.amount);
    expect(bandAmounts[0]).toBe(0);       // 0% on first 125K
    expect(bandAmounts[1]).toBe(2500);    // 2% on next 125K
    expect(bandAmounts[2]).toBe(12500);   // 5% on 250K–500K
  });

  it('calculates correct SDLT for £250,000 property', () => {
    // £0–125K: £0, £125K–250K: £2,500 → total £2,500
    const result = calculate({
      propertyPrice: 250000,
      location: 'england',
      buyerType: 'standard',
      ukResident: true,
    });
    expect(result.taxAmount).toBe(2500);
  });

  it('calculates correct SDLT for £1,000,000 property', () => {
    // £0–125K:       0%  = £0
    // £125K–250K:    2%  = £2,500
    // £250K–925K:    5%  = £33,750
    // £925K–1M:      10% = £7,500
    // Total = £43,750
    const result = calculate({
      propertyPrice: 1000000,
      location: 'england',
      buyerType: 'standard',
      ukResident: true,
    });
    expect(result.taxAmount).toBe(43750);
  });
});

describe('England — First-time buyer', () => {
  it('applies FTB relief for £400,000 property (under £500K limit)', () => {
    // FTB bands: 0% on first £300K, 5% on £300K–500K
    // £300K–400K at 5% = £5,000
    const result = calculate({
      propertyPrice: 400000,
      location: 'england',
      buyerType: 'first_time',
      ukResident: true,
    });
    expect(result.taxAmount).toBe(5000);
  });

  it('applies no FTB relief for £600,000 property (over £500K limit) — uses standard rates', () => {
    // Standard: £0 + £2,500 + 5%*(600K-250K) = £2,500 + £17,500 = £20,000
    const result = calculate({
      propertyPrice: 600000,
      location: 'england',
      buyerType: 'first_time',
      ukResident: true,
    });
    // Standard rates: 0 + 2500 + 17500 = £20,000
    expect(result.taxAmount).toBe(20000);
    expect(result.note).toBeTruthy();
  });

  it('FTB pays £0 on a £300,000 property (nil-rate up to £300K)', () => {
    const result = calculate({
      propertyPrice: 300000,
      location: 'england',
      buyerType: 'first_time',
      ukResident: true,
    });
    expect(result.taxAmount).toBe(0);
  });
});

describe('England — Additional property', () => {
  it('adds 5% to each band for £500,000 additional property', () => {
    // Adjusted bands: 5%, 7%, 10%, 15%, 17%
    // £0–125K:   5%  = £6,250
    // £125K–250K: 7% = £8,750
    // £250K–500K: 10% = £25,000
    // Total = £40,000
    const result = calculate({
      propertyPrice: 500000,
      location: 'england',
      buyerType: 'additional',
      ukResident: true,
    });
    expect(result.taxAmount).toBe(40000);
    expect(result.surcharges.length).toBeGreaterThan(0);
    expect(result.surcharges[0].label).toMatch(/additional property surcharge/i);

    // Standard was £15,000 — additional is £25,000 more (5% of 500K)
    expect(result.taxAmount - 15000).toBe(25000);
  });
});

describe('England — Non-resident surcharge', () => {
  it('adds 2% on top for non-UK resident standard buyer at £500,000', () => {
    // Standard SDLT = £15,000
    // Non-resident: 2% of £500,000 = £10,000
    // Total = £25,000
    const result = calculate({
      propertyPrice: 500000,
      location: 'england',
      buyerType: 'standard',
      ukResident: false,
    });
    expect(result.taxAmount).toBe(25000);
    expect(result.surcharges.some(s => /non-uk resident/i.test(s.label))).toBe(true);
  });

  it('stacks non-resident surcharge on top of additional property surcharge', () => {
    // Additional SDLT at £500K = £40,000
    // Non-resident: 2% of £500K = £10,000
    // Total = £50,000
    const result = calculate({
      propertyPrice: 500000,
      location: 'england',
      buyerType: 'additional',
      ukResident: false,
    });
    expect(result.taxAmount).toBe(50000);
    expect(result.surcharges.length).toBe(2);
  });
});

describe('Scotland — LBTT', () => {
  it('calculates correct LBTT for £300,000 standard property', () => {
    // £0–145K:     0%  = £0
    // £145K–250K:  2%  = £2,100
    // £250K–300K:  5%  = £2,500
    // Total = £4,600
    const result = calculate({
      propertyPrice: 300000,
      location: 'scotland',
      buyerType: 'standard',
      ukResident: true,
    });
    expect(result.taxAmount).toBe(4600);
    expect(result.taxName).toBe('Land and Buildings Transaction Tax');
    expect(result.abbreviation).toBe('LBTT');
  });

  it('applies FTB nil-rate band of £175K for Scotland first-time buyer', () => {
    // FTB bands: 0% to 175K, then 2% 175K–250K, 5% 250K–325K, etc.
    // At £200K: 0% on 175K + 2% on 25K = £500
    const result = calculate({
      propertyPrice: 200000,
      location: 'scotland',
      buyerType: 'first_time',
      ukResident: true,
    });
    expect(result.taxAmount).toBe(500);

    // vs standard which would be 2% on (200K-145K) = £1,100
    const standard = calculate({
      propertyPrice: 200000,
      location: 'scotland',
      buyerType: 'standard',
      ukResident: true,
    });
    expect(standard.taxAmount).toBe(1100);
  });

  it('applies ADS as 8% of FULL purchase price (not marginal) for additional property', () => {
    const propertyPrice = 300000;
    const result = calculate({
      propertyPrice,
      location: 'scotland',
      buyerType: 'additional',
      ukResident: true,
    });

    // LBTT standard = £4,600
    // ADS = 8% of £300,000 = £24,000
    // Total = £28,600
    expect(result.taxAmount).toBe(28600);

    const adsEntry = result.surcharges.find(s => /ADS/i.test(s.label));
    expect(adsEntry).toBeTruthy();
    expect(adsEntry.amount).toBe(24000); // 8% of full price
  });
});

describe('Wales — LTT', () => {
  it('calculates correct LTT for £400,000 standard property', () => {
    // £0–225K:    0%   = £0
    // £225K–400K: 6%   = £10,500
    // Total = £10,500
    const result = calculate({
      propertyPrice: 400000,
      location: 'wales',
      buyerType: 'standard',
      ukResident: true,
    });
    expect(result.taxAmount).toBe(10500);
    expect(result.taxName).toBe('Land Transaction Tax');
    expect(result.abbreviation).toBe('LTT');
  });

  it('applies NO first-time buyer relief in Wales', () => {
    const ftb = calculate({
      propertyPrice: 300000,
      location: 'wales',
      buyerType: 'first_time',
      ukResident: true,
    });
    const standard = calculate({
      propertyPrice: 300000,
      location: 'wales',
      buyerType: 'standard',
      ukResident: true,
    });
    // Should be identical
    expect(ftb.taxAmount).toBe(standard.taxAmount);
    expect(ftb.note).toBeTruthy(); // Should include a note about no FTB relief
  });

  it('uses completely separate additional property rate table for Wales', () => {
    // Additional bands: 5% on 0–180K, 8.5% on 180K–250K, 10% on 250K–400K
    // At £400K:
    // £0–180K:   5%    = £9,000
    // £180K–250K: 8.5% = £5,950
    // £250K–400K: 10%  = £15,000
    // Total = £29,950
    const result = calculate({
      propertyPrice: 400000,
      location: 'wales',
      buyerType: 'additional',
      ukResident: true,
    });
    expect(result.taxAmount).toBe(29950);

    // Standard LTT on same property is £10,500 — this is NOT a surcharge, it's a separate table
    const standard = calculate({
      propertyPrice: 400000,
      location: 'wales',
      buyerType: 'standard',
      ukResident: true,
    });
    expect(result.taxAmount).not.toBe(standard.taxAmount);
  });
});

describe('Cross-region comparison', () => {
  it('returns comparison for all three regions when calculating for England', () => {
    const result = calculate({
      propertyPrice: 500000,
      location: 'england',
      buyerType: 'standard',
      ukResident: true,
    });

    expect(result.comparison).toBeDefined();
    expect(result.comparison['england_and_northern_ireland']).toBeDefined();
    expect(result.comparison['scotland']).toBeDefined();
    expect(result.comparison['wales']).toBeDefined();

    // England primary result should match comparison entry
    expect(result.comparison['england_and_northern_ireland'].taxAmount).toBe(result.taxAmount);

    // Scotland and Wales comparison should use standard rates
    expect(typeof result.comparison['scotland'].taxAmount).toBe('number');
    expect(typeof result.comparison['wales'].taxAmount).toBe('number');
  });

  it('returns correct tax names in comparison', () => {
    const result = calculate({
      propertyPrice: 300000,
      location: 'scotland',
      buyerType: 'standard',
      ukResident: true,
    });

    expect(result.comparison['england_and_northern_ireland'].abbreviation).toBe('SDLT');
    expect(result.comparison['scotland'].abbreviation).toBe('LBTT');
    expect(result.comparison['wales'].abbreviation).toBe('LTT');
  });
});

describe('Input validation', () => {
  it('throws on unknown location', () => {
    expect(() => calculate({
      propertyPrice: 500000,
      location: 'northern_ireland',
      buyerType: 'standard',
      ukResident: true,
    })).toThrow();
  });

  it('throws on invalid buyerType', () => {
    expect(() => calculate({
      propertyPrice: 500000,
      location: 'england',
      buyerType: 'investor',
      ukResident: true,
    })).toThrow();
  });

  it('throws on zero price', () => {
    expect(() => calculate({
      propertyPrice: 0,
      location: 'england',
      buyerType: 'standard',
      ukResident: true,
    })).toThrow();
  });
});
