import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import ArticleFeed from './ArticleFeed';
import SeoHead, { SITE_URL } from '../shared/SeoHead';
import Breadcrumbs from '../shared/Breadcrumbs';
import type { Filters } from './FilterBar';

const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const displayName = slug
    ? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  const filters: Filters = {
    search: '',
    location: '',
    category: displayName,
    dateRange: 'all',
  };

  const title = `${displayName} - Australian Property News`;
  const description = `Latest ${displayName.toLowerCase()} news and analysis from the Australian property market. Stay up to date with PropertyHack.`;

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <SeoHead
        title={title}
        description={description}
        canonicalUrl={`/category/${slug}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title,
          description,
          url: `${SITE_URL}/category/${slug}`,
        }}
      />
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: displayName },
          ]}
        />

        <h1 className="text-3xl sm:text-4xl font-bold text-brand-primary mb-8">
          {displayName}
        </h1>

        <ArticleFeed filters={filters} />
      </main>

      <Footer />
    </div>
  );
};

export default CategoryPage;
