import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSocialPosts,
  deleteSocialPost,
  retrySocialPost,
  approveSocialPost,
  type SocialPost,
  type SocialPostStatus,
  type SocialPlatform,
} from '../../../services/adminSocialService';
import LoadingSpinner from '../../shared/LoadingSpinner';
import EmptyState from '../../shared/EmptyState';
import SocialStatsBar from './SocialStatsBar';
import SocialPostCard from './SocialPostCard';

const SocialPostList: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [statusFilter, setStatusFilter] = useState<SocialPostStatus | ''>('');
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSocialPosts({
        page,
        limit: 20,
        status: statusFilter || undefined,
        platform: platformFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: search || undefined,
      });
      setPosts(res.posts);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, platformFilter, dateFrom, dateTo, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const resetPage = () => setPage(1);

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await retrySocialPost(id);
      await fetchPosts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to retry post');
    } finally {
      setRetryingId(null);
    }
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await approveSocialPost(id);
      await fetchPosts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve post');
    } finally {
      setApprovingId(null);
    }
  };

  const handleCancel = async (post: SocialPost) => {
    if (!confirm('Cancel this scheduled post? This cannot be undone.')) return;
    try {
      await deleteSocialPost(post.id);
      await fetchPosts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel post');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    resetPage();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-content">Social Posts</h1>
          <p className="text-sm text-content-secondary mt-0.5">{total} total</p>
        </div>
        <button
          onClick={() => navigate('/admin/social/new')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-brand-gold text-brand-primary text-sm font-semibold hover:bg-yellow-400 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Post
        </button>
      </div>

      <SocialStatsBar />

      <div className="bg-base-100 rounded-lg shadow-soft overflow-hidden">
        {/* Filter bar */}
        <div className="px-4 py-3 border-b border-base-300 flex flex-wrap items-center gap-3">
          <select
            value={platformFilter}
            onChange={(e) => { setPlatformFilter(e.target.value as SocialPlatform | ''); resetPage(); }}
            className="text-sm border border-base-300 rounded px-2 py-1.5 text-content bg-base-100 focus:outline-none focus:ring-2 focus:ring-brand-gold"
          >
            <option value="">All platforms</option>
            <option value="facebook">Facebook</option>
            <option value="twitter">X (Twitter)</option>
            <option value="instagram">Instagram</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as SocialPostStatus | ''); resetPage(); }}
            className="text-sm border border-base-300 rounded px-2 py-1.5 text-content bg-base-100 focus:outline-none focus:ring-2 focus:ring-brand-gold"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PUBLISHED">Published</option>
            <option value="FAILED">Failed</option>
          </select>

          <div className="flex items-center gap-1.5 text-sm">
            <label className="text-content-secondary text-xs whitespace-nowrap">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
              className="border border-base-300 rounded px-2 py-1.5 text-content bg-base-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
            />
          </div>

          <div className="flex items-center gap-1.5 text-sm">
            <label className="text-content-secondary text-xs whitespace-nowrap">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
              className="border border-base-300 rounded px-2 py-1.5 text-content bg-base-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
            />
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 ml-auto">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search posts…"
              className="text-sm border border-base-300 rounded px-2 py-1.5 text-content bg-base-100 focus:outline-none focus:ring-2 focus:ring-brand-gold w-48"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-sm rounded border border-base-300 text-content hover:bg-base-200 transition-colors"
            >
              Search
            </button>
            {(search || searchInput) && (
              <button
                type="button"
                onClick={() => { setSearch(''); setSearchInput(''); resetPage(); }}
                className="text-xs text-content-secondary hover:text-content"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Post list */}
        {loading ? (
          <div className="py-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-sm text-red-500">{error}</div>
        ) : posts.length === 0 ? (
          <EmptyState
            title="No social posts found"
            message={
              statusFilter || platformFilter || search
                ? 'Try adjusting your filters.'
                : 'Create your first post to get started.'
            }
            action={
              !statusFilter && !platformFilter && !search ? (
                <button
                  onClick={() => navigate('/admin/social/new')}
                  className="px-4 py-2 rounded bg-brand-gold text-brand-primary text-sm font-semibold hover:bg-yellow-400 transition-colors"
                >
                  New Post
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="p-4 flex flex-col gap-3">
            {posts.map((post) => (
              <SocialPostCard
                key={post.id}
                post={post}
                onRetry={handleRetry}
                onApprove={handleApprove}
                onCancel={handleCancel}
                retrying={retryingId === post.id}
                approving={approvingId === post.id}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-4 py-3 border-t border-base-300 flex items-center justify-between">
            <span className="text-sm text-content-secondary">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded border border-base-300 text-content disabled:opacity-40 hover:bg-base-200 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded border border-base-300 text-content disabled:opacity-40 hover:bg-base-200 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialPostList;
