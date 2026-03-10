import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getArticles,
  bulkAction,
  generateSocialPosts,
  Article,
  ArticleListParams,
} from '../../services/adminArticleService';
import LoadingSpinner from '../shared/LoadingSpinner';
import EmptyState from '../shared/EmptyState';

const STATUS_BADGES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-yellow-100 text-yellow-700',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

const CATEGORIES = [
  'Uncategorised',
  'Market News',
  'Investment',
  'Finance & Rates',
  'Rental Market',
  'Property Development',
  'Government & Policy',
  'Commercial',
  'International',
];

const MARKETS = ['AU', 'US', 'UK', 'CA'];

function RelevanceBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">—</span>;
  }
  let cls = '';
  if (score >= 7) cls = 'bg-green-100 text-green-700';
  else if (score >= 4) cls = 'bg-yellow-100 text-yellow-700';
  else cls = 'bg-red-100 text-red-700';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{score}</span>;
}

const ArticleList: React.FC = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterRelevance, setFilterRelevance] = useState('');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ArticleListParams = { page, limit: 20 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      if (filterSource) params.sourceId = filterSource;
      if (filterRelevance === 'high') { params.minRelevance = 7; params.maxRelevance = 10; }
      else if (filterRelevance === 'medium') { params.minRelevance = 4; params.maxRelevance = 6; }
      else if (filterRelevance === 'low') { params.minRelevance = 1; params.maxRelevance = 3; }
      const data = await getArticles(params);
      setArticles(data.articles);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setSelected(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterStatus, filterCategory, filterSource, filterRelevance]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [debouncedSearch, filterStatus, filterCategory, filterSource, filterRelevance]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === articles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(articles.map(a => a.id)));
    }
  };

  const handleGenerateSocial = async (articleId: string) => {
    setGeneratingId(articleId);
    try {
      await generateSocialPosts(articleId);
      navigate('/admin/social');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate social posts');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleBulk = async (action: 'publish' | 'archive' | 'delete') => {
    if (!selected.size) return;
    if (action === 'delete' && !confirm(`Delete ${selected.size} article(s)? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      await bulkAction(Array.from(selected), action);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bulk action failed');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-content">Articles</h1>
        <span className="text-sm text-content-secondary">{total} total</span>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search title..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-base-300 rounded px-3 py-1.5 text-sm bg-base-100 text-content focus:outline-none focus:border-brand-gold w-56"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-base-300 rounded px-3 py-1.5 text-sm bg-base-100 text-content focus:outline-none focus:border-brand-gold"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border border-base-300 rounded px-3 py-1.5 text-sm bg-base-100 text-content focus:outline-none focus:border-brand-gold"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterRelevance}
          onChange={e => setFilterRelevance(e.target.value)}
          className="border border-base-300 rounded px-3 py-1.5 text-sm bg-base-100 text-content focus:outline-none focus:border-brand-gold"
        >
          <option value="">All Relevance</option>
          <option value="high">High (7+)</option>
          <option value="medium">Medium (4-6)</option>
          <option value="low">Low (1-3)</option>
        </select>
        {filterStatus || filterCategory || filterSource || filterRelevance || search ? (
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterCategory(''); setFilterSource(''); setFilterRelevance(''); }}
            className="text-sm text-content-secondary hover:text-content underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-brand-secondary text-white px-4 py-2 rounded text-sm">
          <span>{selected.size} selected</span>
          <button
            onClick={() => handleBulk('publish')}
            disabled={bulkLoading}
            className="px-3 py-1 bg-brand-gold text-brand-primary rounded font-medium hover:opacity-90 disabled:opacity-50"
          >
            Publish
          </button>
          <button
            onClick={() => handleBulk('archive')}
            disabled={bulkLoading}
            className="px-3 py-1 bg-white/20 rounded hover:bg-white/30 disabled:opacity-50"
          >
            Archive
          </button>
          <button
            onClick={() => handleBulk('delete')}
            disabled={bulkLoading}
            className="px-3 py-1 bg-red-500/80 rounded hover:bg-red-500 disabled:opacity-50"
          >
            Delete
          </button>
          {bulkLoading && <LoadingSpinner size="sm" />}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : articles.length === 0 ? (
        <EmptyState title="No articles found" message="Try adjusting your filters or adding some articles." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-base-100 rounded border border-base-300 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-base-200 border-b border-base-300">
                <tr>
                  <th className="w-10 px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === articles.length && articles.length > 0}
                      onChange={toggleAll}
                      className="accent-brand-gold"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Title</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Source</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Category</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Relevance</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Views</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300">
                {articles.map(article => (
                  <ArticleRow
                    key={article.id}
                    article={article}
                    selected={selected.has(article.id)}
                    onToggle={() => toggleSelect(article.id)}
                    onEdit={() => navigate(`/admin/articles/${article.id}/edit`)}
                    onReload={load}
                    setError={setError}
                    onGenerateSocial={() => handleGenerateSocial(article.id)}
                    generatingId={generatingId}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {articles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                selected={selected.has(article.id)}
                onToggle={() => toggleSelect(article.id)}
                onEdit={() => navigate(`/admin/articles/${article.id}/edit`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-base-300 rounded bg-base-100 disabled:opacity-40 hover:border-brand-gold"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={[
                        'w-8 h-8 text-sm rounded',
                        page === p
                          ? 'bg-brand-gold text-brand-primary font-semibold'
                          : 'border border-base-300 bg-base-100 hover:border-brand-gold',
                      ].join(' ')}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-base-300 rounded bg-base-100 disabled:opacity-40 hover:border-brand-gold"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface ArticleRowProps {
  article: Article;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onReload: () => void;
  setError: (msg: string) => void;
  onGenerateSocial: () => void;
  generatingId: string | null;
}

const ArticleRow: React.FC<ArticleRowProps> = ({ article, selected, onToggle, onEdit, onGenerateSocial, generatingId }) => {
  return (
    <tr className={selected ? 'bg-yellow-50' : 'hover:bg-base-200/50'}>
      <td className="px-3 py-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="accent-brand-gold"
        />
      </td>
      <td className="px-3 py-2.5 max-w-xs">
        <button
          onClick={onEdit}
          className="text-left hover:text-brand-accent font-medium text-content"
        >
          {article.isFeatured && (
            <svg className="inline w-3.5 h-3.5 text-brand-gold mr-1 mb-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          )}
          {truncate(article.title, 60)}
        </button>
      </td>
      <td className="px-3 py-2.5 text-content-secondary text-xs whitespace-nowrap">
        {article.source?.name || '—'}
      </td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGES[article.status] || 'bg-gray-100 text-gray-600'}`}>
          {article.status}
        </span>
      </td>
      <td className="px-3 py-2.5 text-content-secondary text-xs whitespace-nowrap">
        {article.category}
      </td>
      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
        <RelevanceBadge score={article.relevanceScore} />
      </td>
      <td className="px-3 py-2.5 text-content-secondary text-xs whitespace-nowrap">
        {timeAgo(article.createdAt)}
      </td>
      <td className="px-3 py-2.5 text-content-secondary text-xs">
        {article.viewCount}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="text-xs px-2 py-1 bg-brand-gold text-brand-primary rounded font-medium hover:opacity-90"
          >
            Edit
          </button>
          <button
            onClick={onGenerateSocial}
            disabled={generatingId === article.id}
            className="p-1.5 rounded text-content-secondary hover:text-brand-gold hover:bg-base-200 transition-colors disabled:opacity-50"
            title="Generate Social Posts"
          >
            {generatingId === article.id ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            )}
          </button>
        </div>
      </td>
    </tr>
  );
};

interface ArticleCardProps {
  article: Article;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, selected, onToggle, onEdit }) => {
  return (
    <div className={`bg-base-100 rounded border p-3 space-y-2 ${selected ? 'border-brand-gold' : 'border-base-300'}`}>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-0.5 accent-brand-gold flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <button onClick={onEdit} className="text-left font-medium text-content hover:text-brand-accent text-sm">
            {article.isFeatured && (
              <svg className="inline w-3.5 h-3.5 text-brand-gold mr-1 mb-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
            {truncate(article.title, 60)}
          </button>
        </div>
        <button
          onClick={onEdit}
          className="text-xs px-2 py-1 bg-brand-gold text-brand-primary rounded font-medium hover:opacity-90 flex-shrink-0"
        >
          Edit
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap text-xs text-content-secondary pl-6">
        <span className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${STATUS_BADGES[article.status] || 'bg-gray-100 text-gray-600'}`}>
          {article.status}
        </span>
        <span>{article.category}</span>
        <RelevanceBadge score={article.relevanceScore} />
        <span>{article.source?.name || '—'}</span>
        <span>{timeAgo(article.createdAt)}</span>
        <span>{article.viewCount} views</span>
      </div>
    </div>
  );
};

export default ArticleList;
