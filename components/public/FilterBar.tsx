import React, { useEffect, useRef, useState } from 'react';
import { getCategories, getLocations } from '../../services/publicArticleService';

export type DateRange = 'all' | 'today' | 'week' | 'month';

export interface Filters {
  search: string;
  location: string;
  category: string;
  dateRange: DateRange;
}

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  detectedLocation?: string | null;
  locationLoading?: boolean;
}

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange, detectedLocation, locationLoading }) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    getCategories().then((r) => setCategories(r.categories)).catch(() => {});
    getLocations().then((r) => setLocations(r.locations)).catch(() => {});
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: value });
    }, 300);
  };

  const handleSelect = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.search || filters.location || filters.category || filters.dateRange !== 'all';

  const showDetectedPill =
    !locationLoading && detectedLocation && filters.location === detectedLocation;

  const clearFilters = () => {
    setSearchInput('');
    onChange({ search: '', location: '', category: '', dateRange: 'all' });
  };

  return (
    <div className="sticky top-14 z-20 bg-base-100 border-b border-base-300 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search property news..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-base-200 border border-base-300 rounded-lg text-content placeholder-content-secondary focus:outline-none focus:border-brand-gold focus:bg-base-100 transition-colors"
            />
          </div>

          {/* Location */}
          <select
            value={filters.location}
            onChange={(e) => handleSelect('location', e.target.value)}
            className="py-2 px-3 text-sm bg-base-200 border border-base-300 rounded-lg text-content focus:outline-none focus:border-brand-gold transition-colors cursor-pointer"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          {/* Category */}
          <select
            value={filters.category}
            onChange={(e) => handleSelect('category', e.target.value)}
            className="py-2 px-3 text-sm bg-base-200 border border-base-300 rounded-lg text-content focus:outline-none focus:border-brand-gold transition-colors cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1 bg-base-200 border border-base-300 rounded-lg p-1">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect('dateRange', opt.value)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors${
                  filters.dateRange === opt.value
                    ? ' bg-brand-gold text-brand-primary'
                    : ' text-content-secondary hover:text-content hover:bg-base-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-content-secondary hover:text-brand-primary border border-base-300 rounded-lg hover:border-brand-gold transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
        </div>

        {/* Detected location pill */}
        {showDetectedPill && (
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/30">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Using your location: {detectedLocation}
            </span>
            <button
              onClick={() => handleSelect('location', '')}
              className="text-xs text-content-secondary hover:text-content underline transition-colors"
            >
              Change
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
