# Property Calculators — Multi-Market Specification

## Overview

Expand the Property Hack calculator suite across 5 markets: Australia, United States, United Kingdom, Canada, and New Zealand. Some calculators are universal (same logic, localised inputs). Others are jurisdiction-specific because the underlying tax or cost structure differs fundamentally between countries. This spec defines which calculators exist in each market, what inputs and outputs they need, and how the jurisdiction-specific logic works.

---

## Markets & Currencies

| Market | Currency | Currency Symbol | Locale |
|--------|----------|-----------------|--------|
| Australia | AUD | $ | en-AU |
| United States | USD | $ | en-US |
| United Kingdom | GBP | £ | en-GB |
| Canada | CAD | $ | en-CA |
| New Zealand | NZD | $ | en-NZ |

The user selects their market from a global selector (persistent across sessions). All calculators, inputs, defaults, and terminology adapt to the selected market. Currency formatting, decimal separators, and number grouping must follow each locale's conventions.

---

## Calculator Matrix — What Exists Where

| Calculator | AU | US | UK | CA | NZ |
|-----------|----|----|----|----|-----|
| Mortgage Repayment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Property Transfer Tax | ✅ Stamp Duty | ✅ Transfer Tax & Closing Costs | ✅ SDLT / LBTT / LTT | ✅ Land Transfer Tax | ❌ No transfer tax |
| Rental Yield | ✅ | ✅ | ✅ | ✅ | ✅ |
| Borrowing Power | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rent vs Buy | ✅ | ✅ | ✅ | ✅ | ✅ |
| Buying Costs (NZ only) | — | — | — | — | ✅ |

New Zealand has no stamp duty or transfer tax, so instead of a transfer tax calculator it gets a "Buying Costs Estimator" that totals up legal fees, inspections, and other closing costs unique to NZ.

---

## 1. Mortgage Repayment Calculator (Global — All 5 Markets)

This calculator is structurally the same everywhere. The differences are in defaults, terminology, and a few market-specific options.

### Universal Inputs

- Property price
- Deposit amount or deposit percentage (toggle)
- Loan term — slider or dropdown
- Interest rate (%) — manual entry
- Repayment type: Principal & Interest / Interest Only
- Repayment frequency

### Universal Outputs

- Repayment amount per selected frequency
- Total interest paid over the loan term
- Total amount repaid (principal + interest)
- Loan-to-value ratio (LVR/LTV)
- Amortisation/amortization chart (stacked area — principal vs interest over time)
- Yearly breakdown table (expandable)

### Market-Specific Defaults & Variations

| Setting | AU | US | UK | CA | NZ |
|---------|----|----|----|----|-----|
| Default loan term | 30 years | 30 years | 25 years | 25 years | 30 years |
| Default interest rate | 6.5% | 7.0% | 4.5% | 5.5% | 6.5% |
| Repayment frequencies | Weekly, Fortnightly, Monthly | Monthly, Bi-weekly | Monthly | Monthly, Bi-weekly, Accelerated bi-weekly | Weekly, Fortnightly, Monthly |
| LVR/LTV threshold note | >80% LVR = LMI may apply | >80% LTV = PMI may apply | >75% LTV = higher rates likely | >80% LTV = CMHC insurance required | >80% LVR = Low equity premium applies |
| Terminology | "Loan term", "Repayments" | "Loan term", "Payments" | "Mortgage term", "Repayments" | "Amortization period", "Payments" | "Loan term", "Repayments" |

**Canada-specific addition:** Include a toggle for "Amortization period" (max 25 years for insured mortgages, max 30 years for uninsured). Show a note when the user selects >25 years: "Insured mortgages (less than 20% down) are limited to a 25-year amortization."

**Canada-specific addition:** Include an option to calculate CMHC mortgage default insurance premium. If the deposit is less than 20%, show the CMHC premium as a separate line item. CMHC premiums are tiered: 4.00% for 5% down, 3.10% for 10% down, 2.80% for 15% down. The premium is added to the mortgage balance.

**US-specific addition:** Include an optional PMI (Private Mortgage Insurance) estimate when LTV exceeds 80%. Typical PMI ranges from 0.5% to 1.5% of the loan amount annually. Show it as a monthly add-on to the repayment figure with a note: "PMI can typically be removed once you reach 20% equity."

**NZ-specific addition:** Show low equity premium note when LVR exceeds 80%. New Zealand banks charge a low equity premium (LEP) — typically 0.25% to 1.0% added to the interest rate, or a one-off fee of roughly 1.2% of the loan. Display this as a note rather than baking it into the calculation, since LEP structures vary by lender.

---

## 2. Property Transfer Tax Calculator (Market-Specific)

This is the most complex calculator because every market has a completely different tax structure. Each market's version is essentially a standalone calculator with its own logic, but they share the same UI patterns and saved scenario system.

---

### 2a. Australia — Stamp Duty Calculator (Already Built)

Already built. No changes needed. Covers all 8 states/territories with buyer type (standard, first home buyer, foreign), property type, and primary residence toggle.

---

### 2b. United States — Transfer Tax & Closing Costs Calculator

The US does not have a single national transfer tax. Transfer taxes are set at the state level, and sometimes at the county and city level too. Thirteen states charge no transfer tax at all. Rates vary wildly — from a flat $2 in Arizona to tiered percentage-based systems in New York. On top of transfer taxes, US buyers face significant closing costs that don't exist in other markets (title insurance, escrow fees, etc.).

**Inputs:**

- Property price (USD)
- State — dropdown (all 50 states + DC)
- County/City — conditional dropdown (only appears for states with local transfer taxes, e.g. New York, California, Illinois)
- Buyer type: Standard / First-time buyer (some states offer exemptions)
- Property type: Primary residence / Investment / Second home
- Loan amount (for mortgage recording tax states)
- Who pays: Buyer / Seller / Split (default based on state custom, user can override)

**Outputs:**

- State transfer tax amount
- County/city transfer tax amount (if applicable)
- Mortgage recording tax (if applicable — e.g. New York, Florida, Maryland)
- Estimated title insurance cost
- Estimated total closing costs (transfer tax + title + escrow + recording fees + misc)
- Effective tax rate as % of purchase price
- Note if state has no transfer tax (Alaska, Idaho, Indiana, Kansas, Louisiana, Mississippi, Missouri, Montana, New Mexico, North Dakota, Oregon (mostly), Texas, Utah, Wyoming)

**Implementation notes:**

- Transfer tax data must be stored as configuration (JSON), not hardcoded in logic. Rates change and local overrides are common.
- For states with no transfer tax, the calculator should still work — it just shows $0 for transfer tax and focuses on estimated closing costs.
- Include a disclaimer: "Transfer taxes vary by county and municipality. This is an estimate — consult a local attorney or title company for exact costs."
- The US system is inherently messier than other markets. Accuracy at the state level is the priority. County/city level is a nice-to-have for the top 10 most-searched states.

---

### 2c. United Kingdom — Stamp Duty / LBTT / LTT Calculator

The UK has three separate property transaction tax systems depending on where in the UK the property is located. The calculator must handle all three.

**System 1: England & Northern Ireland — Stamp Duty Land Tax (SDLT)**

Administered by HMRC. Progressive/tiered system.

Current standard residential rates (from 1 April 2025):
- 0% on the first £125,000
- 2% on £125,001 to £250,000
- 5% on £250,001 to £925,000
- 10% on £925,001 to £1,500,000
- 12% above £1,500,000

First-time buyer relief (properties up to £500,000):
- 0% on the first £300,000
- 5% on £300,001 to £500,000
- If property exceeds £500,000, first-time buyer relief is lost entirely and standard rates apply

Additional property surcharge: 5% added to each band (for second homes, buy-to-let)

Non-UK resident surcharge: additional 2% on top of all rates

**System 2: Scotland — Land and Buildings Transaction Tax (LBTT)**

Administered by Revenue Scotland. Different bands from England.

Current standard residential rates:
- 0% up to £145,000
- 2% on £145,001 to £250,000
- 5% on £250,001 to £325,000
- 10% on £325,001 to £750,000
- 12% above £750,000

First-time buyer relief: nil-rate band raised to £175,000 (instead of £145,000)

Additional Dwelling Supplement (ADS): 8% of the entire purchase price (not marginal — applied on the full price). This is significantly higher than England's surcharge.

**System 3: Wales — Land Transaction Tax (LTT)**

Administered by the Welsh Revenue Authority.

Current standard residential rates:
- 0% up to £225,000
- 6% on £225,001 to £400,000
- 7.5% on £400,001 to £750,000
- 10% on £750,001 to £1,500,000
- 12% above £1,500,000

No first-time buyer relief in Wales. The Welsh Government's position is that the £225,000 nil-rate threshold already provides sufficient help.

Higher rates for additional properties use a completely separate rate table (not a simple surcharge):
- 5% on £0 to £180,000
- 8.5% on £180,001 to £250,000
- 10% on £250,001 to £400,000
- 12.5% on £400,001 to £750,000
- 15% on £750,001 to £1,500,000
- 17% above £1,500,000

**Inputs:**

- Property price (GBP)
- Location: England & Northern Ireland / Scotland / Wales (the entire calculator reconfigures based on this selection)
- Buyer type: Standard / First-time buyer / Additional property (second home or buy-to-let)
- UK resident: Yes / No (only relevant for England & NI — adds 2% surcharge if non-resident)

**Outputs:**

- Tax amount (labelled correctly: "SDLT", "LBTT", or "LTT" depending on location)
- Band-by-band breakdown showing how the tax is calculated at each tier
- Effective tax rate as % of purchase price
- Any applicable surcharges shown as separate line items
- Comparison note: "In [other region], the same property would cost £X in tax" (show all three for comparison)
- For Scotland additional properties: clearly explain the ADS is 8% of the full price, not marginal

**Implementation notes:**

- All three tax systems must be stored as separate configuration objects. They change independently.
- The UK calculator is essentially three calculators behind one UI. The location selector is the primary control.
- Wales additional property rates are a completely separate table, not standard rates + surcharge. Don't try to compute them as a surcharge.

---

### 2d. Canada — Land Transfer Tax Calculator

Canada's land transfer tax varies by province and territory. Most provinces use a progressive bracket system. Alberta and Saskatchewan don't charge a land transfer tax at all — they charge small flat registration fees instead. Toronto charges a municipal LTT on top of the Ontario provincial LTT, effectively doubling the tax.

**Inputs:**

- Property price (CAD)
- Province/Territory — dropdown (all 13)
- City — conditional dropdown (appears for Ontario to identify Toronto, and for Quebec to identify Montreal, as these cities have municipal taxes on top of provincial)
- Buyer type: Standard / First-time home buyer
- Canadian citizen or permanent resident: Yes / No (affects Non-Resident Speculation Tax in Ontario)

**Outputs:**

- Provincial land transfer tax amount
- Municipal land transfer tax amount (if applicable — Toronto, Montreal)
- Non-Resident Speculation Tax (if applicable — 25% in Ontario for non-residents)
- Total tax payable
- First-time buyer rebate amount (if eligible)
- Net tax after rebate
- Effective tax rate as % of purchase price

**Province-Specific Details (store as config data):**

**Ontario:**
- Progressive brackets: 0.5% up to $55K, 1% from $55K–$250K, 1.5% from $250K–$400K, 2% from $400K–$2M, 2.5% above $2M
- First-time buyer rebate: up to $4,000
- Toronto Municipal LTT: identical bracket structure to provincial, charged on top. First-time buyer rebate up to $4,475 for the municipal portion
- Non-Resident Speculation Tax: 25% for non-citizens/non-permanent residents in Ontario

**British Columbia:**
- Progressive rates: 1% on first $200K, 2% on $200K–$2M, 3% on $2M–$3M, 5% above $3M (residential)
- First-time buyer exemption: full exemption up to $835,000, partial between $835K–$860K
- Newly built home exemption: full exemption up to $1,100,000
- Foreign buyer additional tax: 20% in designated areas
- Note: Foreign buyer ban currently in effect until January 2027

**Quebec:**
- Called "Welcome Tax" (taxe de Bienvenue). Set by municipality but general structure: 0.5% up to ~$55K, 1% from ~$55K–$276K, 1.5%+ above. Montreal has its own higher brackets up to 4.5%.

**Alberta:**
- No land transfer tax. Charges a flat registration fee: $50 base + $5 per $5,000 of property value. Plus mortgage registration: $50 base + $5 per $5,000 of mortgage amount. Show these as "Title Transfer Fee" and "Mortgage Registration Fee."

**Saskatchewan:**
- No land transfer tax. Charges a title transfer fee: 0.3% of property value. Show as "Title Transfer Fee."

**Manitoba:**
- Progressive brackets: 0% up to $30K, 0.5% $30K–$90K, 1% $90K–$150K, 1.5% $150K–$200K, 2% above $200K

**Atlantic provinces (NB, NS, NL, PEI):**
- New Brunswick: flat 1% of purchase price
- Nova Scotia: municipal deed transfer tax, varies by municipality (0.5%–1.5%). Build with a few major municipalities selectable.
- Newfoundland & Labrador: $100 flat fee + $0.40 per $100 over $500
- PEI: 1% of purchase price. First-time buyer rebate available.

**Territories (YT, NT, NU):**
- Small registration fees only, no LTT. Show as "Registration Fee."

**Implementation notes:**

- Toronto and Montreal need special handling. When a user selects Ontario → Toronto, the calculator must compute both provincial AND municipal LTT.
- Alberta and Saskatchewan should still appear in the calculator but show "No land transfer tax in this province" with the small registration fees calculated instead.
- First-time buyer eligibility rules vary by province. Show a brief eligibility summary for the selected province, not a full legal breakdown.
- The foreign buyer ban in Canada (extended to January 2027) means the foreign buyer tax inputs may not be currently relevant, but build the logic anyway — the ban will lift.

---

### 2e. New Zealand — Buying Costs Estimator

New Zealand has no stamp duty, no transfer tax, and no land transfer tax. This is a significant selling point for NZ property and worth highlighting. Instead of a transfer tax calculator, NZ gets a "Buying Costs Estimator" that helps buyers understand the other costs involved.

**Inputs:**

- Property price (NZD)
- Buyer type: Owner-occupier / Investor
- First home buyer: Yes / No (affects eligibility for First Home Loan scheme)
- Deposit percentage
- New build: Yes / No (affects GST and LVR restrictions)

**Outputs:**

- Legal/conveyancing fees: estimated $1,400–$2,500
- Building inspection: estimated $500–$800
- Valuation/registered valuer: estimated $500–$800
- LIM report (Land Information Memorandum): estimated $300–$400
- Lenders Mortgage Insurance / Low Equity Premium: calculated if deposit is less than 20% (approximately 1.2% of loan value for First Home Loans, or 0.5%–2% for standard low-equity loans)
- GST note: if new build, note that 15% GST may be included in the purchase price
- Total estimated buying costs
- Bright-line test note: "If you sell this property within 2 years, any profit may be taxed as income under the bright-line test" (for investors)
- Interest deductibility note for investors: "From April 2025, 100% of mortgage interest is deductible against rental income"

**Design note:** The NZ calculator should prominently note "New Zealand has no stamp duty or transfer tax" — this is genuinely unusual globally and worth highlighting for users comparing markets.

---

## 3. Rental Yield Calculator (Global — All 5 Markets)

Structurally identical across all markets. The only differences are default expense percentages and terminology.

### Universal Inputs & Outputs

Same as the existing Australian calculator: property price, weekly/monthly rental income, optional annual expenses (management fees, council rates, insurance, maintenance, land tax, strata/body corp, other).

### Market-Specific Variations

| Setting | AU | US | UK | CA | NZ |
|---------|----|----|----|----|-----|
| Rent input default | Weekly | Monthly | Monthly (PCM) | Monthly | Weekly |
| Management fee default | 7% | 8–10% | 10–12% | 8–10% | 8% |
| Property tax label | "Council rates" | "Property tax" | "Council tax" | "Property tax" | "Council rates" |
| Strata/HOA label | "Strata/Body corp" | "HOA fees" | "Service charge / Ground rent" | "Condo fees / Strata fees" | "Body corporate" |
| Land tax label | "Land tax" | N/A (included in property tax) | N/A (included in council tax) | N/A (included in property tax) | N/A (included in council rates) |

**UK-specific note:** Include "Ground rent" as a separate optional expense for leasehold properties.

**US-specific note:** Include "Property tax" as a required input (not optional) since US property taxes are substantial (typically 0.5%–2.5% of property value annually) and are the single biggest ongoing cost for US landlords.

**NZ-specific note:** Add a toggle for "Interest deductibility" — from April 2025, NZ investors can deduct 100% of mortgage interest. Show an after-tax yield estimate if the user provides their marginal tax rate and mortgage details.

---

## 4. Borrowing Power Calculator (Global — All 5 Markets)

Same structure everywhere with market-specific serviceability buffers and lending standards.

### Universal Inputs

- Number of applicants (1 or 2)
- Gross annual income per applicant
- Other income (rental, dividends, etc.)
- Monthly living expenses
- Existing liabilities (credit card limits, existing loans, student debt)
- Number of dependants
- Interest rate for assessment

### Market-Specific Variations

| Setting | AU | US | UK | CA | NZ |
|---------|----|----|----|----|-----|
| Serviceability buffer | +3% (APRA guidance) | +2% typical | +3% (PRA stress test) | +2% (OSFI guideline B-20 stress test: higher of 5.25% or contract rate +2%) | +2.5% typical |
| Student debt label | "HECS/HELP" | "Student loans" | "Student loan" | "Student loans" | "Student loan" |
| Student debt treatment | Repayment based on income threshold | Monthly payment amount | Automatic deduction based on income (Plan 1/2/4/5 thresholds) | Monthly payment amount | Automatic deduction based on income (12% above $22,828) |
| Max LVR default | 80% (LMI above) | 80% (PMI above) | 75–80% typical | 80% (CMHC above) | 80% (LEP above) |
| Expense benchmark | HEM (Household Expenditure Measure) | None standard — use declared expenses | ONS Living Costs & Food Survey benchmarks | None standard — use declared expenses | None standard — use declared expenses |

**UK-specific:** Student loan repayment is automatically deducted from salary above a threshold. The threshold depends on the plan type (Plan 1: £24,990/year, Plan 2: £27,295/year, Plan 4 Scotland: £31,395/year, Plan 5: £25,000/year, Postgrad: £21,000/year). Include a dropdown for student loan plan type.

**Canada-specific:** The OSFI B-20 stress test requires lenders to qualify borrowers at the higher of 5.25% or the contract rate plus 2%. Build this into the calculator — it's a hard regulatory requirement, not just a guideline.

---

## 5. Rent vs Buy Calculator (Global — All 5 Markets)

Same structure everywhere. Differences are in default growth rates and a few market-specific cost assumptions.

### Universal Inputs & Outputs

Same as the existing Australian calculator: property price, weekly/monthly rent, deposit, mortgage rate, loan term, expected growth rate, expected rent increase, expected investment return if renting.

### Market-Specific Defaults

| Setting | AU | US | UK | CA | NZ |
|---------|----|----|----|----|-----|
| Default property growth | 5% | 4% | 4% | 4% | 5% |
| Default rent increase | 3% | 3% | 3% | 3% | 3% |
| Default investment return | 7% | 7% | 6% | 6% | 7% |
| Rent input | Weekly | Monthly | Monthly | Monthly | Weekly |
| Include in buying costs | Stamp duty, council rates | Property tax, HOA, PMI | SDLT, council tax, service charge | LTT, property tax | Council rates, insurance |

**US-specific:** Property tax is a major ongoing cost in the US (0.5%–2.5% of property value per year). Include it as a required input in the buying scenario. It significantly affects the rent-vs-buy breakeven point.

**US-specific:** Include an optional "Tax deduction benefit" toggle. US homeowners can deduct mortgage interest and property taxes on their federal income tax return (up to limits). This tilts the equation toward buying. Allow the user to input their marginal tax bracket to estimate the benefit.

---

## 6. New Zealand — Buying Costs Estimator

(Detailed in section 2e above. This replaces the transfer tax calculator for NZ.)

---

## Architecture & Localisation Approach

### Market Selector

- A persistent market selector in the calculator section header (flag icon + country name).
- Default market detected from user's IP/browser locale. User can override.
- Selection is saved in local storage / user preferences so it persists across sessions.
- Changing market swaps calculator availability, input labels, defaults, currency formatting, and all jurisdiction-specific logic.

### Calculator URL Structure

Clean, SEO-friendly URLs per market:

- `/tools/au/mortgage-calculator`
- `/tools/us/transfer-tax-calculator`
- `/tools/uk/stamp-duty-calculator`
- `/tools/ca/land-transfer-tax-calculator`
- `/tools/nz/buying-costs-calculator`
- `/tools/au/rental-yield-calculator`
- etc.

Each calculator page should have market-specific meta titles and descriptions for SEO. For example:
- AU: "Stamp Duty Calculator Australia 2026 — Calculate by State"
- UK: "Stamp Duty Calculator UK 2026 — SDLT, LBTT & LTT Rates"
- CA: "Land Transfer Tax Calculator Canada 2026 — All Provinces"

### Tax Data as Configuration

All tax brackets, rates, thresholds, and exemption rules must be stored as structured configuration data (JSON or equivalent), completely separate from the calculator's business logic. This is critical because:

- Tax rates change frequently (UK SDLT rates changed April 2025, Canada's provinces update independently, Australian states adjust thresholds)
- Different markets update on different schedules
- The editorial team should be able to update a rate by editing a config file without touching calculator code
- Each jurisdiction's config should include a `lastUpdated` date and `source` URL for auditability

Example config structure:
```
{
  "jurisdiction": "UK_ENGLAND",
  "taxName": "Stamp Duty Land Tax",
  "lastUpdated": "2025-04-01",
  "source": "https://www.gov.uk/stamp-duty-land-tax/residential-property-rates",
  "standardBands": [
    { "from": 0, "to": 125000, "rate": 0.00 },
    { "from": 125001, "to": 250000, "rate": 0.02 },
    ...
  ],
  "firstTimeBuyerBands": [...],
  "additionalPropertySurcharge": 0.05,
  "nonResidentSurcharge": 0.02
}
```

### Shared Components

Despite the jurisdiction differences, all calculators share:

- The same input component library (sliders, currency inputs, dropdowns, toggles)
- The same output patterns (headline number, breakdown grid, charts)
- The same saved scenarios system (unchanged from original spec — scenarios are tagged with both calculator type AND market)
- The same share-via-URL system (query params include market)
- The same responsive layout and design language

### Saved Scenarios — Market Tag

Extend the saved scenario data model to include market:

```
SavedScenario {
  id: UUID
  userId: string
  name: string
  market: enum [AU, US, UK, CA, NZ]
  calculatorType: enum [mortgage, transfer_tax, rental_yield, borrowing_power, rent_vs_buy, buying_costs]
  inputs: JSON
  outputs: JSON
  createdAt: timestamp
  updatedAt: timestamp
}
```

The dashboard should allow filtering by market as well as by calculator type.

---

## Priority & Phasing

### Phase 1 — Launch (Immediate)

All 5 markets, all global calculators (mortgage, rental yield, borrowing power, rent vs buy) with market-specific defaults and terminology. These are lower-risk because the core logic is the same.

Plus:
- AU Stamp Duty Calculator (already built)
- UK SDLT / LBTT / LTT Calculator (high traffic potential, well-defined rules)
- NZ Buying Costs Estimator (simple, quick to build)

### Phase 2 — Fast Follow

- CA Land Transfer Tax Calculator (complex due to 13 provinces + Toronto/Montreal municipal taxes)
- US Transfer Tax & Closing Costs Calculator at the state level (50 states is a data project)

### Phase 3 — Enhancement

- US county/city-level transfer tax data for top 10 states
- Rate comparison features across markets ("What would this property cost in the UK vs Australia?")
- Automatic rate update alerts when tax brackets change

---

## Out of Scope

- Real-time mortgage rate feeds from lenders
- Integration with property listings or price data
- Multi-currency conversion between markets
- Tax advice or compliance guidance (always include appropriate disclaimers)
- Languages other than English (for now)

---

## Summary

Build 5 global calculators (Mortgage, Rental Yield, Borrowing Power, Rent vs Buy) that adapt their defaults, terminology, and market-specific logic per country. Build 4 jurisdiction-specific transfer tax calculators (AU Stamp Duty already done, UK SDLT/LBTT/LTT, CA Land Transfer Tax, US Transfer Tax & Closing Costs) plus a NZ Buying Costs Estimator. All tax data stored as configuration for easy updates. Extend the saved scenarios system with a market tag. Use clean per-market URLs for SEO. Phase the rollout starting with global calculators and the UK/NZ transfer tax tools.
