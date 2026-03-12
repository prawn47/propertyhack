import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../services/apiConfig';

interface SearchResultsProps {
  query: string;
  country: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({ query, country }) => {
  const [overview, setOverview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!query) {
      setOverview(null);
      setLoading(false);
      setError(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setOverview(null);

    const url = getApiUrl(
      `/api/articles/search-overview?search=${encodeURIComponent(query)}&country=${encodeURIComponent(country)}`
    );

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setOverview(data.overview ?? null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          if (err.name !== 'AbortError') {
            setError(true);
          }
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [query, country]);

  if (!query) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-content mb-4">
        Results for &lsquo;{query}&rsquo;
      </h2>

      {loading && (
        <div className="bg-amber-50/50 border border-brand-gold/20 rounded-xl p-5 animate-pulse">
          <div className="h-3 bg-base-300 rounded w-24 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-base-300 rounded w-full" />
            <div className="h-3 bg-base-300 rounded w-5/6" />
            <div className="h-3 bg-base-300 rounded w-4/6" />
          </div>
        </div>
      )}

      {!loading && overview !== null && (
        <div className="bg-amber-50/50 border border-brand-gold/20 rounded-xl p-5">
          <span className="text-xs font-semibold text-brand-gold uppercase tracking-wide mb-2 block">
            AI Overview
          </span>
          <p className="text-sm text-content leading-relaxed">{overview}</p>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
