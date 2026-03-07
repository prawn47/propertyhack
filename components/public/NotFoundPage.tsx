import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SeoHead from '../shared/SeoHead';

const LOCATIONS = [
  { slug: 'sydney', name: 'Sydney' },
  { slug: 'melbourne', name: 'Melbourne' },
  { slug: 'brisbane', name: 'Brisbane' },
  { slug: 'perth', name: 'Perth' },
  { slug: 'adelaide', name: 'Adelaide' },
  { slug: 'canberra', name: 'Canberra' },
  { slug: 'hobart', name: 'Hobart' },
  { slug: 'darwin', name: 'Darwin' },
  { slug: 'gold-coast', name: 'Gold Coast' },
];

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <SeoHead title="Page Not Found" noindex />
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
        <h1 className="text-5xl font-bold text-brand-primary mb-3">404</h1>
        <p className="text-xl text-content-secondary mb-8">
          This page doesn&apos;t exist or has been moved.
        </p>

        <Link
          to="/"
          className="px-6 py-3 bg-brand-gold text-brand-primary font-bold rounded-xl hover:bg-brand-gold/90 transition-colors shadow-soft mb-12"
        >
          Go to Homepage
        </Link>

        <div className="max-w-lg">
          <h2 className="text-lg font-semibold text-brand-primary mb-4">
            Browse Property News by Location
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {LOCATIONS.map((loc) => (
              <Link
                key={loc.slug}
                to={`/property-news/${loc.slug}`}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-base-100 text-content-secondary border border-base-300 hover:border-brand-gold hover:text-brand-gold transition-colors"
              >
                {loc.name}
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFoundPage;
