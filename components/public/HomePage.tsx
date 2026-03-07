import React, { useEffect, useState } from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import FilterBar from './FilterBar';
import ArticleFeed from './ArticleFeed';
import SeoHead, { SITE_URL } from '../shared/SeoHead';
import type { Filters } from './FilterBar';
import { useLocationDetection } from '../../hooks/useLocationDetection';

const DEFAULT_FILTERS: Filters = {
  search: '',
  location: '',
  category: '',
  dateRange: 'all',
};

const HomePage: React.FC = () => {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const { location: detectedLocation, loading: locationLoading } = useLocationDetection();

  // Once detection resolves, apply detected location as default (only if user hasn't already set one)
  useEffect(() => {
    if (!locationLoading && detectedLocation && !filters.location) {
      setFilters((prev) => ({ ...prev, location: detectedLocation }));
    }
  }, [locationLoading, detectedLocation]);

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
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
        <ArticleFeed filters={filters} />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
