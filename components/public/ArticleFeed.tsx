import React, { useCallback, useEffect, useRef, useState } from 'react';
import ArticleCard from './ArticleCard';
import SubscribeForm from './SubscribeForm';
import { getArticles } from '../../services/publicArticleService';
import type { PublicArticle, GetArticlesParams } from '../../services/publicArticleService';
import type { Filters } from './FilterBar';

function filtersToParams(filters: Filters, country?: string): GetArticlesParams {
  const params: GetArticlesParams = {};
  if (filters.search) params.search = filters.search;
  if (filters.location) params.location = filters.location;
  if (filters.category) params.category = filters.category;
  if (filters.search) params.sort = 'relevance';
  if (country) params.country = country;

  if (filters.dateRange !== 'all') {
    const now = new Date();
    const dateTo = now.toISOString();
    let dateFrom: string;
    if (filters.dateRange === 'today') {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      dateFrom = d.toISOString();
    } else if (filters.dateRange === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      dateFrom = d.toISOString();
    } else {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      dateFrom = d.toISOString();
    }
    params.dateFrom = dateFrom;
    params.dateTo = dateTo;
  }

  return params;
}

const LIMIT = 18;

const SkeletonCard: React.FC<{ wide?: boolean }> = ({ wide }) => (
  <div className={`bg-base-100 rounded-xl shadow-soft overflow-hidden animate-pulse-soft${wide ? ' col-span-full' : ''}`}>
    <div className={`w-full bg-base-300${wide ? ' h-64' : ' h-48'}`} />
    <div className="p-4">
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-20 bg-base-300 rounded-full" />
        <div className="h-5 w-16 bg-base-300 rounded-full" />
      </div>
      <div className="h-5 w-full bg-base-300 rounded mb-2" />
      <div className="h-5 w-3/4 bg-base-300 rounded mb-4" />
      <div className="h-4 w-full bg-base-300 rounded mb-1" />
      <div className="h-4 w-5/6 bg-base-300 rounded mb-1" />
      <div className="h-4 w-4/6 bg-base-300 rounded" />
    </div>
  </div>
);

interface ArticleFeedProps {
  filters: Filters;
  country?: string;
}

const ArticleFeed: React.FC<ArticleFeedProps> = ({ filters, country }) => {
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filtersRef = useRef(filters);
  const countryRef = useRef(country);

  const load = useCallback(async (pageNum: number, replace: boolean) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const params = filtersToParams(filtersRef.current, countryRef.current);
      const data = await getArticles({ ...params, page: pageNum, limit: LIMIT });
      setArticles((prev) => (replace ? data.articles : [...prev, ...data.articles]));
      setTotalPages(data.totalPages);
      setPage(pageNum);
    } catch (err) {
      setError('Failed to load articles. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    filtersRef.current = filters;
    countryRef.current = country;
    load(1, true);
  }, [filters, country, load]);

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      load(page + 1, false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard wide />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-content-secondary mb-4">{error}</p>
        <button
          onClick={() => load(1, true)}
          className="px-4 py-2 bg-brand-gold text-brand-primary font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-200 mb-4">
          <svg className="w-8 h-8 text-content-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-brand-primary mb-2">No articles found</h3>
        <p className="text-content-secondary text-sm">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  const featured = articles.filter((a) => a.isFeatured);
  const regular = articles.filter((a) => !a.isFeatured);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Featured articles span full width */}
        {featured.map((article) => (
          <div key={article.id} className="col-span-full">
            <ArticleCard article={article} featured />
          </div>
        ))}

        {/* Regular articles in grid with subscribe CTA */}
        {regular.map((article, index) => (
          <React.Fragment key={article.id}>
            <ArticleCard article={article} />
            {index === 4 && (
              <div className="col-span-full">
                <SubscribeForm variant="inline" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Load more */}
      {page < totalPages && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-8 py-3 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Loading...
              </span>
            ) : (
              'Load more articles'
            )}
          </button>
        </div>
      )}

      {/* Loading more skeleton */}
      {loadingMore && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
    </div>
  );
};

export default ArticleFeed;
