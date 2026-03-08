# Multi-Market Property Calculators — Proposal

## Problem Statement
PropertyHack's calculator suite currently only supports Australia. The platform now serves 5 markets (AU, US, UK, CA, NZ), but calculators are hardcoded to Australian tax rules, terminology, and defaults. Users in other markets get irrelevant results or no calculator at all.

## Why Now
- Global platform expansion already shipped — market selector and per-country routing are live
- Calculators are the highest-intent pages on the site (users actively buying/investing)
- SEO opportunity: "stamp duty calculator UK", "land transfer tax Ontario", "mortgage calculator NZ" are high-volume keywords in every market
- The AU stamp duty calculator is already built and proven — patterns exist to extend

## Scope — In for v1

### Global Calculators (adapt existing AU logic to all 5 markets)
1. **Mortgage Repayment** — market-specific defaults, frequencies, and terminology (PMI for US, CMHC for CA, LEP for NZ)
2. **Rental Yield** — market-specific rent input format, expense labels, and defaults
3. **Borrowing Power** — market-specific serviceability buffers, student debt treatment, lending standards
4. **Rent vs Buy** — market-specific default growth rates and cost inclusions

### Jurisdiction-Specific Transfer Tax Calculators
5. **AU Stamp Duty** — already built, no changes needed
6. **UK SDLT / LBTT / LTT** — three separate tax systems (England, Scotland, Wales)
7. **CA Land Transfer Tax** — 13 provinces + Toronto/Montreal municipal taxes
8. **US Transfer Tax & Closing Costs** — 50 states, county/city level for top states
9. **NZ Buying Costs Estimator** — no transfer tax; estimates legal, inspection, and closing costs

### Infrastructure
- All tax data stored as JSON configuration (not hardcoded)
- Market-aware URL structure: `/tools/:market/:calculator`
- Saved scenarios tagged with market
- Market selector persistent across sessions

## Explicitly Deferred
- Real-time mortgage rate feeds from lenders
- Property listing / price data integration
- Multi-currency conversion between markets
- Tax advice or compliance guidance
- Non-English languages
- County/city-level US data beyond top 10 states (Phase 3)
- Cross-market comparison features (Phase 3)

## Affected Areas
- **Frontend**: Calculator components, URL routing, market selector, saved scenarios UI
- **Backend**: Calculator engine modules, tax config data files, scenario API (market field)
- **Database**: SavedScenario model (add market enum), calculator config tables
- **SEO**: Per-market meta tags, sitemap entries for new calculator URLs

## Breaking Risk
- Low. AU calculators remain unchanged. New markets are additive.
- SavedScenario schema change (adding market field) requires migration — existing AU scenarios default to 'AU'.

## Acceptance Criteria
1. All 5 global calculators work correctly for all 5 markets with appropriate defaults and terminology
2. UK calculator correctly computes SDLT, LBTT, and LTT with all buyer types and surcharges
3. CA calculator handles all 13 provinces including Toronto/Montreal municipal taxes
4. US calculator computes state-level transfer taxes for all 50 states + DC
5. NZ buying costs estimator shows correct cost ranges and regulatory notes
6. Tax data is stored as config files, not hardcoded in logic
7. URLs follow `/tools/:market/:calculator` pattern
8. Saved scenarios include market tag and can be filtered by market
9. Currency formatting follows each locale's conventions
