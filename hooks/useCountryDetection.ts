import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ph_country';

export interface UseCountryDetectionResult {
  country: string | null;
  loading: boolean;
  setCountry: (code: string | null) => void;
}

export function useCountryDetection(): UseCountryDetectionResult {
  const [country, setCountryState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setCountry = useCallback((code: string | null) => {
    setCountryState(code);
    if (code) {
      localStorage.setItem(STORAGE_KEY, code);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        if (!cancelled) {
          setCountryState(stored);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch('http://ip-api.com/json/?fields=status,countryCode');
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          if (data.status === 'success' && data.countryCode) {
            setCountryState(data.countryCode);
            localStorage.setItem(STORAGE_KEY, data.countryCode);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    detect();

    return () => {
      cancelled = true;
    };
  }, []);

  return { country, loading, setCountry };
}
