import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSocialPosts,
  deleteSocialPost,
  type SocialPost,
  type SocialPostStatus,
  type SocialPlatform,
} from '../../services/adminSocialService';
import LoadingSpinner from '../shared/LoadingSpinner';
import EmptyState from '../shared/EmptyState';

const STATUS_LABELS: Record<SocialPostStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  FAILED: 'Failed',
};

const STATUS_CLASSES: Record<SocialPostStatus, string> = {
  DRAFT: 'bg-gray-700 text-gray-200',
  PENDING_APPROVAL: 'bg-yellow-800 text-yellow-200',
  SCHEDULED: 'bg-blue-800 text-blue-200',
  PUBLISHED: 'bg-green-800 text-green-200',
  FAILED: 'bg-red-800 text-red-200',
};

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  twitter: 'X',
  facebook: 'FB',
  linkedin: 'LI',
  instagram: 'IG',
};

const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  twitter: 'bg-slate-700 text-slate-200',
  facebook: 'bg-blue-900 text-blue-200',
  linkedin: 'bg-sky-900 text-sky-200',
  instagram: 'bg-pink-900 text-pink-200',
};

function PlatformBadges({ platforms }: { platforms: SocialPlatform[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {platforms.map((p) => (
        <span
          key={p}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${PLATFORM_COLORS[p]}`}
          title={p.charAt(0).toUpperCase() + p.slice(1)}
        >
          {PLATFORM_LABELS[p]}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: SocialPostStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const SocialPostList: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SocialPostStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSocialPosts({
        page,
        limit: 20,
        status: statusFilter || undefined,
      });
      setPosts(res.posts);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value as SocialPostStatus | '');
    setPage(1);
  };

  const handleDelete = async (post: SocialPost, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete this post? This cannot be undone.`)) return;
    setDeletingId(post.id);
    try {
      await deleteSocialPost(post.id);
      await fetchPosts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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

      <div className="bg-base-100 rounded-lg shadow-soft overflow-hidden">
        <div className="px-4 py-3 border-b border-base-300 flex items-center gap-3">
          <label className="text-sm font-medium text-content-secondary">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="text-sm border border-base-300 rounded px-2 py-1 text-content bg-base-100 focus:outline-none focus:ring-2 focus:ring-brand-gold"
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PUBLISHED">Published</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="px-4 py-8 text-center text-sm text-red-500">{error}</div>
        ) : posts.length === 0 ? (
          <EmptyState
            title="No social posts yet"
            message="Create your first post to get started."
            action={
              <button
                onClick={() => navigate('/admin/social/new')}
                className="px-4 py-2 rounded bg-brand-gold text-brand-primary text-sm font-semibold hover:bg-yellow-400 transition-colors"
              >
                New Post
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-300 bg-base-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wide">Content</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wide">Platforms</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wide">Article</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300">
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    onClick={() => navigate(`/admin/social/${post.id}`)}
                    className="hover:bg-base-200 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 max-w-xs">
                      <span className="text-content line-clamp-2">
                        {post.content.length > 80 ? post.content.slice(0, 80) + '…' : post.content}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <PlatformBadges platforms={post.platforms as SocialPlatform[]} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={post.status} />
                    </td>
                    <td className="px-4 py-3 text-content-secondary max-w-[160px] truncate">
                      {post.article ? post.article.title : '—'}
                    </td>
                    <td className="px-4 py-3 text-content-secondary whitespace-nowrap">
                      {post.status === 'SCHEDULED' && post.scheduledFor
                        ? formatDate(post.scheduledFor)
                        : post.status === 'PUBLISHED' && post.publishedAt
                        ? formatDate(post.publishedAt)
                        : formatDate(post.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {(post.status === 'DRAFT' || post.status === 'SCHEDULED') && (
                        <button
                          onClick={(e) => handleDelete(post, e)}
                          disabled={deletingId === post.id}
                          className="p-1.5 rounded text-content-secondary hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
