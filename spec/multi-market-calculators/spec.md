# Multi-Market Property Calculators — Specification

## 1. Problem

PropertyHack serves 5 markets (AU, US, UK, CA, NZ) but calculators are AU-only. The stamp duty calculator only handles Australian states, borrowing power hardcodes ATO tax brackets and HECS thresholds, and all currency formatting is locked to `en-AU`/`AUD`. Users in other markets get irrelevant results or no calculator at all.

## 2. Personas

### Property Buyer (any market)
- Wants quick mortgage repayment estimates, transfer tax costs, and borrowing capacity
- Expects inputs and terminology that match their country (e.g. "Property tax" not "Council rates" in the US)
- Won't tolerate seeing Australian defaults or dollar signs when they're in the UK

### Property Investor (any market)
- Compares rental yields across properties in their market
- Needs accurate transfer tax/stamp duty calculations for their jurisdiction
- May save multiple scenarios across different properties

### Returning User
- Has saved scenarios tagged to their market
- Expects the market selector to persist across sessions
- May switch markets to compare (e.g. NZ vs AU investor)

## 3. Current State

### Already Built (AU)
- 5 calculator components: Mortgage, Stamp Duty, Rental Yield, Borrowing Power, Rent vs Buy
- Shared component library: CurrencyInput, PercentageInput, SliderInput, ResultCard, SaveScenarioButton, ShareButton, ExpandableSection
- CalculatorLayout wrapper (two-panel responsive layout)
- Backend calculator engines in `server/calculators/`
- Stamp duty config data in `server/config/calculators/stampDutyBrackets.json`
- HEM and HECS config data for borrowing power
- API routes at `/api/calculators/:type/calculate`
- SavedScenario model (missing market field)
- CountryContext with market detection (URL → preference → localStorage → IP)
- ToolsIndex already filters calculators by country
- URL routing: `/:country/tools/*` with SUPPORTED_MARKETS = ['au', 'us', 'uk', 'ca', 'nz']

### What's AU-Locked
- StampDutyCalculator — hardcoded to 8 AU states
- BorrowingPowerCalculator — hardcodes ATO tax brackets, Medicare levy, LITO, HEM, HECS
- All components hardcode `en-AU` locale and `AUD` currency in Intl.NumberFormat
- Stamp duty API route validates only AU states
- SavedScenario has no market field

### What's Market-Agnostic (math only)
- mortgageCalculator.js — P&I/IO math works for any market
- rentalYieldCalculator.js — gross/net yield math is universal
- rentVsBuyCalculator.js — comparison math is universal

## 4. Features

### F1. Market-Aware Currency & Formatting
- All calculator components read currency/locale from CountryContext instead of hardcoding AU
- Currency formatting follows locale conventions (£ for UK, $ for US/CA/AU/NZ)
- Number grouping and decimal separators follow locale

### F2. Global Calculator Adaptation (Mortgage, Rental Yield, Borrowing Power, Rent vs Buy)
- Each calculator loads market-specific defaults (rates, terms, frequencies, labels)
- Market config stored in `server/config/calculators/marketDefaults.json`
- Backend calculator engines accept a `market` parameter
- Market-specific UI additions (PMI for US, CMHC for CA, LEP for NZ, student loan plan selector for UK)
- Borrowing power engine refactored: extract AU-specific logic (ATO brackets, HEM, HECS), add equivalent configs per market

### F3. UK Stamp Duty Calculator (SDLT / LBTT / LTT)
- Three tax systems behind one UI, selected by location (England & NI / Scotland / Wales)
- Config data for all three systems in `server/config/calculators/ukTransferTax.json`
- Band-by-band breakdown, effective rate, surcharge line items
- Cross-region comparison ("In Scotland, this would cost £X")
- Buyer types: Standard / First-time / Additional property
- Non-resident surcharge (England & NI only)

### F4. Canada Land Transfer Tax Calculator
- All 13 provinces/territories with config data in `server/config/calculators/caTransferTax.json`
- Toronto municipal LTT (Ontario → Toronto triggers dual calculation)
- Montreal municipal tax (Quebec → Montreal)
- First-time buyer rebates per province
- Non-Resident Speculation Tax (Ontario)
- Alberta/Saskatchewan: show registration fees instead of LTT

### F5. US Transfer Tax & Closing Costs Calculator
- All 50 states + DC with config data in `server/config/calculators/usTransferTax.json`
- State-level transfer tax rates
- Mortgage recording tax for applicable states
- Estimated title insurance and closing costs
- 13 no-transfer-tax states handled gracefully
- County/city level deferred to Phase 3

### F6. NZ Buying Costs Estimator
- Cost range estimates (legal, inspection, valuation, LIM)
- Low equity premium calculation when deposit < 20%
- GST note for new builds
- Bright-line test and interest deductibility notes
- Prominent "No stamp duty in NZ" messaging

### F7. SavedScenario Market Tag
- Add `market` field to SavedScenario model (Prisma migration)
- Backfill existing scenarios with market = 'AU'
- Scenario dashboard filterable by market
- Add BUYING_COSTS to CalculatorType enum

### F8. SEO & URL Structure
- Calculator URLs: `/tools/:market/:calculator-slug`
- Market-specific meta titles and descriptions
- Sitemap entries for all calculator pages per market

## 5. Data Model Changes

### SavedScenario — add market field
```prisma
model SavedScenario {
  // ... existing fields
  market         String         @default("AU")  // AU, US, UK, CA, NZ
}

enum CalculatorType {
  MORTGAGE
  STAMP_DUTY
  RENTAL_YIELD
  BORROWING_POWER
  RENT_VS_BUY
  BUYING_COSTS    // new — NZ only
}
```

### New Config Files
```
server/config/calculators/
├── stampDutyBrackets.json      # existing — AU stamp duty
├── hemTable.json               # existing — AU HEM
├── hecsThresholds.json         # existing — AU HECS
├── marketDefaults.json         # new — per-market calculator defaults
├── ukTransferTax.json          # new — SDLT, LBTT, LTT bands
├── caTransferTax.json          # new — all provinces + municipal
├── usTransferTax.json          # new — all 50 states + DC
├── nzBuyingCosts.json          # new — cost ranges
├── borrowingPower/             # new — per-market income tax & lending configs
│   ├── au.json                 # extracted from current hardcoded values
│   ├── us.json
│   ├── uk.json
│   ├── ca.json
│   └── nz.json
```

## 6. API Changes

### Existing endpoints — add market parameter
All `/api/calculators/:type/calculate` endpoints accept an optional `market` query param (defaults to 'AU' for backward compatibility).

### New endpoints
- `POST /api/calculators/transfer-tax/calculate` — unified endpoint that dispatches to the correct engine based on `market`
- `POST /api/calculators/buying-costs/calculate` — NZ buying costs
- `GET /api/calculators/config/:market/:type` — returns the config data for a given market and calculator type (for frontend display of rate tables, last-updated dates, etc.)

### SavedScenario API
- `GET /api/scenarios` — add `market` query filter
- `POST /api/scenarios` — require `market` field in body

## 7. Acceptance Criteria

1. All 5 global calculators render correct currency formatting, defaults, and terminology for each market
2. UK calculator correctly computes SDLT (England), LBTT (Scotland), and LTT (Wales) with all buyer types, surcharges, and cross-region comparison
3. CA calculator handles all 13 provinces including Toronto/Montreal municipal taxes and first-time buyer rebates
4. US calculator computes state-level transfer taxes for all 50 states + DC, showing $0 with closing cost estimates for no-tax states
5. NZ buying costs estimator shows correct cost ranges and regulatory notes
6. All tax data lives in JSON config files, not hardcoded in calculator logic
7. Existing AU calculators continue to work identically (backward compatible)
8. SavedScenario model includes market field, existing scenarios backfilled as AU
9. Calculator URLs follow `/:country/tools/:calculator-slug` pattern (already partially working via existing routing)
10. Each calculator page has market-specific meta title and description
