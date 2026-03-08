import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const STORAGE_KEY = 'ph_country';
const SUPPORTED_MARKETS = ['AU', 'US', 'UK', 'CA'];

export interface Market {
  code: string;
  name: string;
  currency: string;
  flagEmoji: string;
  isActive: boolean;
}

export interface CountryContextValue {
  country: string;
  setCountry: (c: string) => void;
  markets: Market[];
  loading: boolean;
}

const CountryContext = createContext<CountryContextValue>({
  country: 'AU',
  setCountry: () => {},
  markets: [],
  loading: false,
});

export function useCountry(): CountryContextValue {
  return useContext(CountryContext);
}

interface CountryProviderProps {
  children: React.ReactNode;
  countryFromUrl?: string;
}

export function CountryProvider({ children, countryFromUrl }: CountryProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const resolveInitialCountry = (): string => {
    if (countryFromUrl && SUPPORTED_MARKETS.includes(countryFromUrl.toUpperCase())) {
      return countryFromUrl.toUpperCase();
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_MARKETS.includes(stored.toUpperCase())) {
      return stored.toUpperCase();
    }
    return 'AU';
  };

  const [country, setCountryState] = useState<string>(resolveInitialCountry);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countryFromUrl && SUPPORTED_MARKETS.includes(countryFromUrl.toUpperCase())) {
      const upper = countryFromUrl.toUpperCase();
      if (upper !== country) {
        setCountryState(upper);
      }
    }
  }, [countryFromUrl]);

  useEffect(() => {
    async function fetchMarkets() {
      try {
        setLoading(true);
        const res = await fetch('/api/markets');
        if (res.ok) {
          const data = await res.json();
          setMarkets(data.markets || []);
        }
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    }
    fetchMarkets();
  }, []);

  const setCountry = useCallback((c: string) => {
    const upper = c.toUpperCase();
    setCountryState(upper);
    localStorage.setItem(STORAGE_KEY, upper);

    const pathParts = location.pathname.split('/').filter(Boolean);
    const currentCountry = pathParts[0]?.toLowerCase();
    if (SUPPORTED_MARKETS.includes(currentCountry?.toUpperCase() ?? '')) {
      const rest = pathParts.slice(1).join('/');
      navigate(`/${upper.toLowerCase()}${rest ? `/${rest}` : ''}`, { replace: false });
    }
  }, [navigate, location.pathname]);

  return (
    <CountryContext.Provider value={{ country, setCountry, markets, loading }}>
      {children}
    </CountryContext.Provider>
  );
}
