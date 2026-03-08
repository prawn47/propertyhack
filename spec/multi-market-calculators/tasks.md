# Multi-Market Property Calculators — Tasks

## Phase 1: Foundation & Global Calculator Adaptation

The infrastructure layer that everything else depends on: market-aware formatting, config structure, schema changes, and adapting the 4 global calculators.

### T1. Market Defaults Config & Currency Localisation
- Create `server/config/calculators/marketDefaults.json` with per-market defaults for all calculators (default rates, terms, frequencies, labels, terminology)
- Update all calculator frontend components to read currency/locale from CountryContext instead of hardcoding `en-AU`/`AUD`
- Update CurrencyInput, ResultCard, and any shared components that format currency
- Test: each calculator renders correct currency symbol and number formatting for all 5 markets
- **Dependencies:** none

### T2. SavedScenario Schema Migration
- Add `market` field to SavedScenario model (String, default 'AU')
- Add `BUYING_COSTS` to CalculatorType enum
- Create Prisma migration
- Write data migration to backfill existing scenarios with market = 'AU'
- Update scenario API routes to accept/return market field
- Update scenario dashboard to support market filter
- **Dependencies:** none

### T3. Mortgage Calculator — Multi-Market
- Update mortgage backend engine to accept market param and return market-specific notes
- Add market-specific repayment frequency options per market config
- Add Canada CMHC insurance premium calculation (tiered: 4% at 5% down, 3.1% at 10%, 2.8% at 15%)
- Add US PMI estimate display when LTV > 80% (0.5%–1.5% annually, shown as monthly add-on)
- Add NZ low equity premium note when LVR > 80%
- Add Canada amortization period toggle (25yr insured max / 30yr uninsured)
- Update frontend to show/hide market-specific sections based on CountryContext
- **Dependencies:** T1

### T4. Rental Yield Calculator — Multi-Market
- Update frontend labels per market (rent input format, expense labels from marketDefaults)
- Default rent input to weekly for AU/NZ, monthly for US/UK/CA
- Make US "Property tax" a required input (not optional)
- Add UK "Ground rent" as optional expense for leasehold
- Add NZ "Interest deductibility" toggle with after-tax yield estimate
- **Dependencies:** T1

### T5. Borrowing Power Calculator — Multi-Market
- Extract AU-specific data from hardcoded values into `server/config/calculators/borrowingPower/au.json` (ATO brackets, Medicare levy, LITO, HEM, HECS thresholds)
- Create per-market config files: `us.json`, `uk.json`, `ca.json`, `nz.json` with income tax brackets, student debt treatment, serviceability buffers
- Refactor `borrowingPowerCalculator.js` to load config by market param
- Add UK student loan plan type dropdown (Plan 1/2/4/5/Postgrad with income thresholds)
- Add Canada OSFI B-20 stress test (higher of 5.25% or contract+2%)
- Add NZ student loan deduction (12% above $22,828)
- Update frontend to show market-appropriate student debt label and inputs
- **Dependencies:** T1

### T6. Rent vs Buy Calculator — Multi-Market
- Update frontend defaults per market (growth rates, rent input format)
- Add US property tax as required input in buying scenario
- Add US tax deduction benefit toggle (mortgage interest + property tax deduction with marginal tax bracket input)
- Update buying cost assumptions per market
- **Dependencies:** T1

### T7. Calculator API Routes — Market Parameter
- Add `market` query param to all existing `/api/calculators/:type/calculate` endpoints
- Default to 'AU' for backward compatibility
- Update stamp duty route to dispatch based on market (not just AU state validation)
- Add `GET /api/calculators/config/:market/:type` endpoint for frontend config display
- **Dependencies:** T1

---

## Phase 2: UK & NZ Transfer Tax Calculators

Lower complexity jurisdiction-specific calculators with well-defined rules.

### T8. UK Transfer Tax Config Data
- Create `server/config/calculators/ukTransferTax.json` with all three systems:
  - England & NI SDLT: standard bands, first-time buyer bands, additional property surcharge (5%), non-resident surcharge (2%)
  - Scotland LBTT: standard bands, first-time buyer nil-rate extension, ADS (8% of full price)
  - Wales LTT: standard bands, separate additional property rate table (not a surcharge)
- Include `lastUpdated` and `source` URL for each system
- **Dependencies:** none

### T9. UK Transfer Tax Calculator Engine
- Create `server/calculators/ukTransferTaxCalculator.js`
- Implement progressive band calculation for SDLT, LBTT, and LTT
- Handle first-time buyer relief (England: £300K nil-rate up to £500K; Scotland: £175K nil-rate; Wales: none)
- Handle additional property surcharges (England: +5% per band; Scotland: 8% flat on full price; Wales: separate rate table)
- Handle non-resident surcharge (England only: +2%)
- Return band-by-band breakdown, effective rate, and cross-region comparison amounts
- Unit tests covering all three systems × all buyer types
- **Dependencies:** T8

### T10. UK Transfer Tax Calculator Frontend
- Create `UkTransferTaxCalculator.tsx` component
- Location selector (England & NI / Scotland / Wales) as primary control — reconfigures entire form
- Buyer type: Standard / First-time / Additional property
- UK resident toggle (England & NI only)
- Results: tax amount with correct label (SDLT/LBTT/LTT), band breakdown, effective rate, surcharge line items
- Cross-region comparison panel
- Scotland ADS explanation note
- **Dependencies:** T9, T1

### T11. NZ Buying Costs Config & Engine
- Create `server/config/calculators/nzBuyingCosts.json` with cost ranges (legal, inspection, valuation, LIM, LEP rates)
- Create `server/calculators/nzBuyingCostsCalculator.js`
- Calculate low equity premium when deposit < 20%
- Return itemised cost breakdown with min/max ranges
- Include regulatory notes (bright-line test, interest deductibility, GST for new builds)
- **Dependencies:** none

### T12. NZ Buying Costs Calculator Frontend
- Create `NzBuyingCostsCalculator.tsx` component
- Inputs: property price, buyer type, first home buyer toggle, deposit %, new build toggle
- Prominent "No stamp duty in NZ" banner
- Itemised cost breakdown with ranges
- Regulatory notes section (bright-line, interest deductibility, GST)
- **Dependencies:** T11, T1

### T13. ToolsIndex & Routing Updates (Phase 2)
- Update ToolsIndex calculator list to show UK SDLT and NZ Buying Costs for their respective markets
- Add routes in App.tsx for new calculator pages
- Add calculator-specific SEO meta tags (title, description) per market
- Update sitemap generation to include new calculator URLs
- **Dependencies:** T10, T12

---

## Phase 3: Canada Land Transfer Tax Calculator

More complex due to 13 provinces with different bracket systems plus municipal taxes.

### T14. Canada Transfer Tax Config Data
- Create `server/config/calculators/caTransferTax.json` with all 13 provinces/territories:
  - Ontario: progressive brackets + Toronto municipal LTT + first-time rebates + NRST
  - BC: progressive brackets + first-time/new-build exemptions + foreign buyer tax
  - Quebec: Welcome Tax brackets + Montreal municipal brackets
  - Manitoba: progressive brackets
  - Alberta: flat registration fees (title + mortgage)
  - Saskatchewan: 0.3% title transfer fee
  - Atlantic (NB, NS, NL, PEI): varied simple rates
  - Territories (YT, NT, NU): small registration fees
- Include first-time buyer eligibility summaries per province
- Include `lastUpdated` and `source` per province
- **Dependencies:** none

### T15. Canada Transfer Tax Calculator Engine
- Create `server/calculators/caTransferTaxCalculator.js`
- Progressive band calculation for bracket-based provinces
- Flat fee calculation for Alberta, Saskatchewan, territories
- Toronto dual LTT calculation (provincial + municipal)
- Montreal municipal tax calculation
- First-time buyer rebate calculations per province
- Non-Resident Speculation Tax (Ontario: 25%)
- BC foreign buyer additional tax (20% in designated areas)
- Unit tests per province including edge cases (Toronto, Montreal, Alberta)
- **Dependencies:** T14

### T16. Canada Transfer Tax Calculator Frontend
- Create `CaTransferTaxCalculator.tsx` component
- Province/territory dropdown
- Conditional city dropdown (Ontario → Toronto; Quebec → Montreal)
- Buyer type: Standard / First-time
- Resident status toggle (Ontario NRST)
- Results: provincial + municipal amounts, rebates, net tax, effective rate
- Province-specific eligibility notes
- "No land transfer tax" messaging for Alberta/Saskatchewan/territories with fee breakdown
- **Dependencies:** T15, T1

### T17. ToolsIndex & Routing Updates (Phase 3)
- Update ToolsIndex for CA land transfer tax
- Add routes and SEO meta
- Update sitemap
- **Dependencies:** T16

---

## Phase 4: US Transfer Tax & Closing Costs Calculator

Data-heavy — 50 states with varied rules. State-level accuracy is the priority.

### T18. US Transfer Tax Config Data
- Create `server/config/calculators/usTransferTax.json` with all 50 states + DC:
  - Rate type per state (flat rate, tiered, per-$100, per-$500, fixed amount, none)
  - 13 no-tax states flagged
  - Mortgage recording tax states (NY, FL, MD, etc.)
  - Default "who pays" convention per state
  - First-time buyer exemptions where applicable
  - Estimated title insurance ranges by state
  - Estimated total closing cost percentages by state
- Include `lastUpdated` and `source` per state
- **Dependencies:** none

### T19. US Transfer Tax Calculator Engine
- Create `server/calculators/usTransferTaxCalculator.js`
- Handle multiple rate types (flat %, tiered, per-unit, fixed, none)
- Mortgage recording tax calculation
- Title insurance estimation
- Total closing costs estimation
- Graceful handling of no-tax states (show $0 transfer tax + closing costs)
- Unit tests for representative states (NY tiered, CA flat, TX none, FL with mortgage recording)
- **Dependencies:** T18

### T20. US Transfer Tax Calculator Frontend
- Create `UsTransferTaxCalculator.tsx` component
- State dropdown (all 50 + DC)
- Loan amount input (for mortgage recording tax)
- Who-pays toggle (Buyer/Seller/Split, defaults per state)
- Buyer type and property type selectors
- Results: state tax, mortgage recording tax, title insurance estimate, total closing costs, effective rate
- No-tax state messaging with closing cost focus
- Disclaimer about county/city variations
- **Dependencies:** T19, T1

### T21. ToolsIndex & Routing Updates (Phase 4)
- Update ToolsIndex for US transfer tax
- Add routes and SEO meta
- Update sitemap
- **Dependencies:** T20

---

## Phase 5: Polish & Integration

### T22. Cross-Calculator Integration Testing
- E2E tests: switch market, verify all calculators load correct defaults/currency/labels
- Test saved scenarios with market filter
- Test URL routing for all market/calculator combinations
- Test SEO meta tags render correctly per market
- Verify backward compatibility — AU calculators unchanged
- **Dependencies:** T13, T17, T21, T2

### T23. Calculator Landing Pages & SEO
- Create market-specific calculator landing page content (intro text, rate summaries, FAQs)
- Ensure all calculator pages have structured data (JSON-LD)
- Verify sitemap includes all new URLs
- Meta title/description templates per market per calculator
- **Dependencies:** T22

---

## Dependency Graph

```
T1 (market defaults + currency) ─┬─→ T3 (mortgage multi-market)
                                  ├─→ T4 (rental yield multi-market)
                                  ├─→ T5 (borrowing power multi-market)
                                  ├─→ T6 (rent vs buy multi-market)
                                  ├─→ T10 (UK frontend) ──────────┐
                                  ├─→ T12 (NZ frontend) ──────────┤
                                  ├─→ T16 (CA frontend) ──────────┤
                                  └─→ T20 (US frontend) ──────────┤
                                                                   │
T2 (schema migration) ─────────────────────────────────────────────┤
T7 (API routes) ← T1                                              │
T8 (UK config) → T9 (UK engine) → T10                             │
T11 (NZ config+engine) → T12                                      │
T14 (CA config) → T15 (CA engine) → T16                           │
T18 (US config) → T19 (US engine) → T20                           │
                                                                   │
T13 (routing phase 2) ← T10, T12 ─────────────────────────────────┤
T17 (routing phase 3) ← T16 ──────────────────────────────────────┤
T21 (routing phase 4) ← T20 ──────────────────────────────────────┤
                                                                   │
T22 (integration testing) ← T2, T13, T17, T21                     │
T23 (SEO) ← T22                                                   │
```

## Parallel Opportunities

- **T1 + T2 + T8 + T11 + T14 + T18** can all start in parallel (no dependencies)
- **T3, T4, T5, T6, T7** can run in parallel once T1 is done
- **T9, T15, T19** can run in parallel (each depends only on its own config task)
- **T10, T12, T16, T20** can run in parallel once their engines + T1 are done
