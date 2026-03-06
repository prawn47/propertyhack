import React, { useState } from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import FilterBar from './FilterBar';
import ArticleFeed from './ArticleFeed';
import type { Filters } from './FilterBar';

interface HomePageProps {
  onAdminClick?: () => void;
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  location: '',
  category: '',
  dateRange: 'all',
};

const HomePage: React.FC<HomePageProps> = ({ onAdminClick }) => {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <Header onAdminClick={onAdminClick} />
      <FilterBar filters={filters} onChange={setFilters} />
      <main className="flex-1">
        <ArticleFeed filters={filters} />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
