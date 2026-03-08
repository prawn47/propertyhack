import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useCountryDetection } from '../hooks/useCountryDetection';
import { getApiUrl } from '../services/apiConfig';

export interface Market {
  id: string;
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

const SUPPORTED_MARKETS = ['AU', 'US', 'UK', 'CA', 'GLOBAL'];
const STORAGE_KEY = 'ph_country';

const CountryContext = createContext<CountryContextValue | null>(null);

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const params = useParams<{ country?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateProfile } = useAuth();
  const { country: detectedCountry, loading: detectLoading } = useCountryDetection();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [resolvedCountry, setResolvedCountry] = useState<string>('AU');
  const initialised = useRef(false);

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const res = await fetch(getApiUrl('/api/markets'));
        if (res.ok) {
          const data: Market[] = await res.json();
          setMarkets(data);
        }
      } catch {
        // leave markets empty — UI degrades gracefully
      } finally {
        setMarketsLoading(false);
      }
    }
    fetchMarkets();
  }, []);

  useEffect(() => {
    if (detectLoading) return;
    if (initialised.current) return;
    initialised.current = true;

    // 1. URL param is highest priority
    const urlCountry = params.country?.toUpperCase();
    if (urlCountry && SUPPORTED_MARKETS.includes(urlCountry)) {
      setResolvedCountry(urlCountry);
      return;
    }

    // 2. Signed-in user preference
    const prefCountry = user?.preferences?.defaultCountry?.toUpperCase();
    if (prefCountry && SUPPORTED_MARKETS.includes(prefCountry)) {
      setResolvedCountry(prefCountry);
      return;
    }

    // 3. localStorage
    const stored = localStorage.getItem(STORAGE_KEY)?.toUpperCase();
    if (stored && SUPPORTED_MARKETS.includes(stored)) {
      setResolvedCountry(stored);
      return;
    }

    // 4. IP detection — map unsupported countries to GLOBAL
    if (detectedCountry) {
      const mapped = SUPPORTED_MARKETS.includes(detectedCountry.toUpperCase())
        ? detectedCountry.toUpperCase()
        : 'GLOBAL';
      setResolvedCountry(mapped);
      localStorage.setItem(STORAGE_KEY, mapped);
      return;
    }

    // 5. Final fallback
    setResolvedCountry('GLOBAL');
  }, [detectLoading, detectedCountry, params.country, user]);

  // Keep resolvedCountry in sync when URL param changes after initial mount
  useEffect(() => {
    const urlCountry = params.country?.toUpperCase();
    if (urlCountry && SUPPORTED_MARKETS.includes(urlCountry)) {
      setResolvedCountry(urlCountry);
    }
  }, [params.country]);

  const setCountry = useCallback(async (newCountry: string) => {
    const upper = newCountry.toUpperCase();

    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, upper);

    // Persist to user profile if signed in
    if (user) {
      try {
        await updateProfile({
          preferences: {
            ...user.preferences,
            defaultCountry: upper,
          },
        });
      } catch {
        // Non-fatal — localStorage is the fallback
      }
    }

    setResolvedCountry(upper);

    // Navigate to new country path, preserving sub-path
    const currentPath = location.pathname;
    const countryPrefix = params.country ? `/${params.country.toLowerCase()}` : '';
    const subPath = countryPrefix
      ? currentPath.slice(countryPrefix.length) || '/'
      : currentPath;
    const newPath = `/${upper.toLowerCase()}${subPath === '/' ? '' : subPath}`;
    navigate(newPath, { replace: true });
  }, [user, updateProfile, location.pathname, params.country, navigate]);

  const loading = marketsLoading || detectLoading;

  return (
    <CountryContext.Provider value={{ country: resolvedCountry, setCountry, markets, loading }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry(): CountryContextValue {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error('useCountry must be used within CountryProvider');
  return ctx;
}
