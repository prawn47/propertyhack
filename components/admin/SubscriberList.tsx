import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';
import EmptyState from '../shared/EmptyState';

interface Subscriber {
  id: string;
  email: string;
  firstName: string;
  country: string;
  region: string;
  createdAt: string;
  unsubscribedAt: string | null;
}

interface CountryStat {
  country: string;
  count: number;
}

interface SubscriberListResponse {
  subscribers: Subscriber[];
  total: number;
  totalPages: number;
  page: number;
  byCountry: CountryStat[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const SubscriberList: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [byCountry, setByCountry] = useState<CountryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/subscribers?page=${page}&limit=50`, { credentials: 'include' });
      if (!res.ok) {
        let msg = `Failed to load subscribers (${res.status})`;
        try { const body = await res.json(); if (body.error) msg = body.error; } catch {}
        throw new Error(msg);
      }
      const data: SubscriberListResponse = await res.json();
      setSubscribers(data.subscribers);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setByCountry(data.byCountry);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Delete subscriber ${email}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/subscribers/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete subscriber');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete subscriber');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-content">Subscribers</h1>
        <span className="text-sm text-content-secondary">{total} total</span>
      </div>

      {/* Stats summary */}
      {byCountry.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byCountry.map((s) => (
            <span
              key={s.country}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-base-200 border border-base-300 rounded text-sm text-content"
            >
              <span className="font-medium">{s.country}</span>
              <span className="text-content-secondary">{s.count}</span>
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm flex items-start justify-between gap-4">
        <span>{error}</span>
        <button
          onClick={load}
          className="shrink-0 text-xs px-2 py-1 bg-red-100 border border-red-300 rounded hover:bg-red-200 font-medium"
        >
          Retry
        </button>
      </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : subscribers.length === 0 ? (
        <EmptyState title="No subscribers yet" message="Subscribers will appear here once people sign up." />
      ) : (
        <>
          <div className="bg-base-100 rounded border border-base-300 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-base-200 border-b border-base-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Email</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Country</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Region</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Joined</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300">
                {subscribers.map((sub) => {
                  const isUnsub = !!sub.unsubscribedAt;
                  return (
                    <tr key={sub.id} className={isUnsub ? 'opacity-50' : 'hover:bg-base-200/50'}>
                      <td className="px-3 py-2.5 text-content">{sub.email}</td>
                      <td className="px-3 py-2.5 text-content-secondary">{sub.firstName || '—'}</td>
                      <td className="px-3 py-2.5 text-content-secondary">{sub.country}</td>
                      <td className="px-3 py-2.5 text-content-secondary">{sub.region || '—'}</td>
                      <td className="px-3 py-2.5 text-content-secondary whitespace-nowrap">{formatDate(sub.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        {isUnsub ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                            Unsubscribed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => handleDelete(sub.id, sub.email)}
                          disabled={deletingId === sub.id}
                          className="text-xs px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === sub.id ? '...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

export default SubscriberList;
