import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export interface Market {
  id: string;
  code: string;
  name: string;
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
  loading: false,
});

export const useCountry = () => useContext(CountryContext);

interface CountryProviderProps {
  children: React.ReactNode;
}

export const CountryProvider: React.FC<CountryProviderProps> = ({ children }) => {
  const params = useParams<{ country?: string }>();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  const urlCountry = params.country ? params.country.toUpperCase() : null;

  const getStoredCountry = (): string => {
    try {
      return localStorage.getItem('ph_country') || 'AU';
    } catch {
      return 'AU';
    }
  };

  const country = urlCountry || getStoredCountry();

  useEffect(() => {
    fetch('/api/markets')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setMarkets(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setCountry = (c: string) => {
    const code = c.toLowerCase();
    try {
      localStorage.setItem('ph_country', c.toUpperCase());
    } catch {}
    navigate(`/${code}`, { replace: true });
  };

  return (
    <CountryContext.Provider value={{ country, setCountry, markets, loading }}>
      {children}
    </CountryContext.Provider>
  );
};
