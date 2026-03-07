import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    getCategories().then((r) => setCategories(r.categories)).catch(() => {});
    getLocations().then((r) => setLocations(r.locations)).catch(() => {});
  }, []);

  const handleSelect = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.search || filters.location || filters.category || filters.dateRange !== 'all';

  const showDetectedPill =
    !locationLoading && detectedLocation && filters.location === detectedLocation;

  const clearFilters = () => {
    onChange({ search: '', location: '', category: '', dateRange: 'all' });
  };

  return (
    <div className="sticky top-14 z-20 bg-base-100 border-b border-base-300 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Location */}
          <select
            value={filters.location}
            onChange={(e) => handleSelect('location', e.target.value)}
            className="py-1.5 px-2 text-xs bg-base-200 border border-base-300 rounded-lg text-content focus:outline-none focus:border-brand-gold transition-colors cursor-pointer max-w-[45%]"
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
            className="py-1.5 px-2 text-xs bg-base-200 border border-base-300 rounded-lg text-content focus:outline-none focus:border-brand-gold transition-colors cursor-pointer max-w-[45%]"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex flex-wrap items-center gap-1 bg-base-200 border border-base-300 rounded-lg p-0.5">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect('dateRange', opt.value)}
                className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-colors${
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
              className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-content-secondary hover:text-brand-primary border border-base-300 rounded-lg hover:border-brand-gold transition-colors"
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
