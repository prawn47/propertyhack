import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import FilterBar from './FilterBar';
import ArticleFeed from './ArticleFeed';
import SearchResults from './SearchResults';
import SeoHead, { SITE_URL } from '../shared/SeoHead';
import type { Filters } from './FilterBar';
import { useLocationDetection } from '../../hooks/useLocationDetection';
import { useCountry } from '../../contexts/CountryContext';

interface UserPreferences {
  defaultLocation?: string;
  defaultCategories?: string[];
  defaultDateRange?: string;
}

function getStoredPreferences(): UserPreferences | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.preferences ?? null;
  } catch {
    return null;
  }
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  location: '',
  category: '',
  dateRange: 'all',
};

const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const { country } = useCountry();

  const prefs = getStoredPreferences();
  const prefLocation = prefs?.defaultLocation ?? '';
  const prefCategory = prefs?.defaultCategories?.[0] ?? '';
  const prefDateRange = (prefs?.defaultDateRange as Filters['dateRange']) ?? 'all';

  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    search: initialSearch,
    location: prefLocation,
    category: prefCategory,
    dateRange: prefDateRange,
  });
  const { location: detectedLocation, loading: locationLoading } = useLocationDetection();

  // Sync URL ?search= param into filters when it changes (e.g. Header search from another page)
  useEffect(() => {
    const q = searchParams.get('search') || '';
    if (q !== filters.search) {
      setFilters((prev) => ({ ...prev, search: q }));
    }
  }, [searchParams]);

  // Once detection resolves, apply detected location as default (only if user hasn't already set one via prefs or manually)
  useEffect(() => {
    if (!locationLoading && detectedLocation && !filters.location) {
      setFilters((prev) => ({ ...prev, location: detectedLocation }));
    }
  }, [locationLoading, detectedLocation]);

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    // Sync search to URL params
    if (newFilters.search) {
      setSearchParams({ search: newFilters.search }, { replace: true });
    } else if (searchParams.has('search')) {
      setSearchParams({}, { replace: true });
    }
    // Sync location changes back to the detection hook so they persist
    if (newFilters.location !== filters.location) {
      const stored = newFilters.location;
      if (stored !== undefined) {
        if (stored) {
          localStorage.setItem('ph_location', stored);
        } else {
          localStorage.removeItem('ph_location');
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <SeoHead
        canonicalUrl="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'PropertyHack',
          url: SITE_URL,
          description: 'Stay informed with agenda-free Australian property news, market updates, and analysis across Sydney, Melbourne, Brisbane, Perth, Adelaide and more.',
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/?search={search_term_string}` },
            'query-input': 'required name=search_term_string',
          },
        }}
      />
      <Header />
      <FilterBar
        filters={filters}
        onChange={handleFiltersChange}
        detectedLocation={detectedLocation}
        locationLoading={locationLoading}
      />
      <main className="flex-1">
        <h1 className="sr-only">Australian Property News & Market Updates</h1>
        {filters.search && <SearchResults query={filters.search} country={country} />}
        <ArticleFeed filters={filters} country={country} />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
