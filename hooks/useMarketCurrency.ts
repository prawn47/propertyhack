import { useCountry } from '../contexts/CountryContext';

const MARKET_LOCALE: Record<string, string> = {
  AU: 'en-AU',
  US: 'en-US',
  UK: 'en-GB',
  CA: 'en-CA',
  NZ: 'en-NZ',
  GLOBAL: 'en-AU',
};

const MARKET_CURRENCY: Record<string, string> = {
  AU: 'AUD',
  US: 'USD',
  UK: 'GBP',
  CA: 'CAD',
  NZ: 'NZD',
  GLOBAL: 'AUD',
};

const MARKET_CURRENCY_SYMBOL: Record<string, string> = {
  AU: '$',
  US: '$',
  UK: '£',
  CA: '$',
  NZ: '$',
  GLOBAL: '$',
};

export function useMarketCurrency() {
  const { country } = useCountry();
  const market = country || 'AU';
  const locale = MARKET_LOCALE[market] ?? 'en-AU';
  const currency = MARKET_CURRENCY[market] ?? 'AUD';
  const currencySymbol = MARKET_CURRENCY_SYMBOL[market] ?? '$';

  function formatCents(cents: number): string {
    const dollars = Math.round(cents) / 100;
    return dollars.toLocaleString(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
  }

  function formatDollars(cents: number): string {
    const dollars = Math.abs(cents) / 100;
    if (dollars >= 1_000_000) {
      const sign = cents < 0 ? '-' : '';
      return `${sign}${currencySymbol}${(dollars / 1_000_000).toFixed(2)}M`;
    }
    const sign = cents < 0 ? '-' : '';
    return `${sign}${currencySymbol}${dollars.toLocaleString(locale, { maximumFractionDigits: 0 })}`;
  }

  function formatChartDollars(value: number): string {
    const dollars = value / 100;
    if (Math.abs(dollars) >= 1_000_000) {
      return `${currencySymbol}${(dollars / 1_000_000).toFixed(1)}M`;
    }
    return `${currencySymbol}${(dollars / 1_000).toFixed(0)}K`;
  }

  function formatNumber(value: number): string {
    return value.toLocaleString(locale, { maximumFractionDigits: 0 });
  }

  return { market, locale, currency, currencySymbol, formatCents, formatDollars, formatChartDollars, formatNumber };
}
