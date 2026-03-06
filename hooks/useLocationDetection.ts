import { useState, useEffect, useCallback } from 'react';
import { getLocations } from '../services/publicArticleService';
import { mapToKnownLocation } from '../utils/locationMapper';

const STORAGE_KEY = 'ph_location';

export interface UseLocationDetectionResult {
  location: string | null;
  loading: boolean;
  error: string | null;
  setLocation: (loc: string) => void;
}

async function detectViaIP(knownLocations: string[]): Promise<string | null> {
  try {
    const res = await fetch('http://ip-api.com/json/');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'success') return null;
    return mapToKnownLocation(
      { city: data.city, regionName: data.regionName, country: data.country },
      knownLocations,
    );
  } catch {
    return null;
  }
}

async function detectViaBrowser(knownLocations: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const res = await fetch(
            `http://ip-api.com/json/?lat=${lat}&lon=${lon}`,
          );
          if (!res.ok) {
            resolve(null);
            return;
          }
          const data = await res.json();
          resolve(
            mapToKnownLocation(
              { city: data.city, regionName: data.regionName, country: data.country, lat, lon },
              knownLocations,
            ),
          );
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { timeout: 5000 },
    );
  });
}

export function useLocationDetection(): UseLocationDetectionResult {
  const [location, setLocationState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setLocation = useCallback((loc: string) => {
    setLocationState(loc);
    if (loc) {
      localStorage.setItem(STORAGE_KEY, loc);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      // Check localStorage first — skip detection on return visits
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        if (!cancelled) {
          setLocationState(stored);
          setLoading(false);
        }
        return;
      }

      try {
        const locData = await getLocations();
        const knownLocations: string[] = locData.locations || [];

        // Try browser geolocation first
        let detected = await detectViaBrowser(knownLocations);

        // Fall back to IP geolocation
        if (!detected) {
          detected = await detectViaIP(knownLocations);
        }

        if (!cancelled) {
          if (detected) {
            setLocationState(detected);
            localStorage.setItem(STORAGE_KEY, detected);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Location detection failed');
          setLoading(false);
        }
      }
    }

    detect();

    return () => {
      cancelled = true;
    };
  }, []);

  return { location, loading, error, setLocation };
}
