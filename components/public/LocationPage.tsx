import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import ArticleFeed from './ArticleFeed';
import SeoHead, { SITE_URL } from '../shared/SeoHead';
import Breadcrumbs from '../shared/Breadcrumbs';
import type { Filters } from './FilterBar';
import { getApiUrl } from '../../services/apiConfig';
import { getCitiesForCountry } from '../../utils/locationMapper';

const COUNTRY_NAMES: Record<string, string> = {
  AU: 'Australia',
  US: 'United States',
  UK: 'United Kingdom',
  CA: 'Canada',
};

interface LocationSeoData {
  metaTitle: string;
  metaDescription: string;
  h1Title: string;
  introContent: string | null;
  focusKeywords: string[];
}

const LocationPage: React.FC = () => {
  const { location, country: countryParam } = useParams<{ location: string; country: string }>();
  const country = (countryParam || 'au').toUpperCase();
  const [seoData, setSeoData] = useState<LocationSeoData | null>(null);

  const displayName = location
    ? location.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  const countryName = COUNTRY_NAMES[country] || country;

  useEffect(() => {
    if (!location) return;
    fetch(getApiUrl(`/api/locations/${location}/seo`))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSeoData(data))
      .catch(() => {});
  }, [location]);

  const filters: Filters = {
    search: '',
    location: displayName,
    category: '',
    dateRange: 'all',
  };

  const title = seoData?.metaTitle || `${displayName} Property News & Market Updates`;
  const description =
    seoData?.metaDescription ||
    `Latest property news, market updates, house prices and real estate analysis for ${displayName}, ${countryName}.`;
  const h1 = seoData?.h1Title || `${displayName} Property News & Market Updates`;

  const countryLower = country.toLowerCase();
  const cityMap = getCitiesForCountry(country);
  const allCities = Object.values(cityMap);
  const otherLocations = allCities.filter((c) => c.slug !== location);

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <SeoHead
        title={title}
        description={description}
        canonicalUrl={`/${countryLower}/property-news/${location}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: h1,
          description,
          url: `${SITE_URL}/${countryLower}/property-news/${location}`,
        }}
      />
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Breadcrumbs
          items={[
            { label: 'Home', href: `/${countryLower}` },
            { label: displayName },
          ]}
        />

        <h1 className="text-3xl sm:text-4xl font-bold text-brand-primary mb-4">
          {h1}
        </h1>

        {seoData?.introContent && (
          <p className="text-lg text-content-secondary mb-8 max-w-3xl leading-relaxed">
            {seoData.introContent}
          </p>
        )}

        <ArticleFeed filters={filters} />

        {/* Cross-links to other locations */}
        <section className="mt-12 pt-8 border-t border-base-300">
          <h2 className="text-lg font-semibold text-brand-primary mb-4">
            Property News by Location in {countryName}
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherLocations.map((loc) => (
              <Link
                key={loc.slug}
                to={`/${countryLower}/property-news/${loc.slug}`}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-base-100 text-content-secondary border border-base-300 hover:border-brand-gold hover:text-brand-gold transition-colors"
              >
                {loc.display}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LocationPage;
