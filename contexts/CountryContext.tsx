import React, { createContext, useContext, useEffect, useState } from 'react';
import { getApiUrl } from '../services/apiConfig';

export interface Market {
  id: string;
  code: string;
  name: string;
  currency: string;
  flagEmoji: string;
  isActive: boolean;
}

interface CountryContextValue {
  country: string;
  setCountry: (c: string) => void;
  markets: Market[];
  loading: boolean;
}

const CountryContext = createContext<CountryContextValue>({
  country: 'AU',
  setCountry: () => {},
  markets: [],
  loading: true,
});

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountryState] = useState<string>(() => {
    return localStorage.getItem('ph_country') || 'AU';
  });

  useEffect(() => {
    fetch(getApiUrl('/api/markets'))
      .then((r) => r.json())
      .then((data: Market[]) => {
        setMarkets(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setCountry = (c: string) => {
    setCountryState(c);
    localStorage.setItem('ph_country', c);
  };

  return (
    <CountryContext.Provider value={{ country, setCountry, markets, loading }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  return useContext(CountryContext);
}
