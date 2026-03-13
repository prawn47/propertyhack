import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getSources,
  deleteSource,
  updateSource,
  triggerFetch,
  type IngestionSource,
  type SourceType,
} from '../../services/adminSourceService';
import LoadingSpinner from '../shared/LoadingSpinner';
import EmptyState from '../shared/EmptyState';

const SOURCE_TYPES: SourceType[] = [
  'RSS', 'NEWSAPI_ORG', 'NEWSAPI_AI', 'PERPLEXITY',
  'SCRAPER', 'NEWSLETTER', 'SOCIAL', 'MANUAL',
];

const TYPE_BADGE_CLASSES: Record<SourceType, string> = {
  RSS: 'bg-blue-100 text-blue-800',
  NEWSAPI_ORG: 'bg-purple-100 text-purple-800',
  NEWSAPI_AI: 'bg-indigo-100 text-indigo-800',
  PERPLEXITY: 'bg-teal-100 text-teal-800',
  SCRAPER: 'bg-orange-100 text-orange-800',
  NEWSLETTER: 'bg-pink-100 text-pink-800',
  SOCIAL: 'bg-cyan-100 text-cyan-800',
  MANUAL: 'bg-gray-100 text-gray-800',
};

function getStatusDot(source: IngestionSource): { color: string; label: string } {
  if (!source.isActive) return { color: 'bg-gray-400', label: 'Paused' };
  if (source.lastError && source.errorCount > 3) return { color: 'bg-red-500', label: 'Error' };
  if (source.errorCount > 0) return { color: 'bg-yellow-400', label: 'Degraded' };
  return { color: 'bg-green-500', label: 'Healthy' };
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}

let toastId = 0;

const SourceList: React.FC = () => {
  const [sources, setSources] = useState<IngestionSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<SourceType | ''>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSources(typeFilter ? { type: typeFilter } : {});
      setSources(data);
    } catch {
      showToast('Failed to load sources', 'error');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleActive = async (source: IngestionSource) => {
    setTogglingId(source.id);
    try {
      const updated = await updateSource(source.id, { isActive: !source.isActive });
      setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, isActive: updated.isActive } : s)));
      showToast(updated.isActive ? 'Source activated' : 'Source paused', 'success');
    } catch {
      showToast('Failed to update source', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleFetchNow = async (source: IngestionSource) => {
    setFetchingId(source.id);
    try {
      await triggerFetch(source.id);
      showToast('Fetch job queued', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to queue fetch';
      showToast(message, 'error');
    } finally {
      setFetchingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteSource(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
      showToast('Source deleted', 'success');
    } catch {
      showToast('Failed to delete source', 'error');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              'px-4 py-3 rounded shadow-medium text-sm font-medium pointer-events-auto animate-fade-in',
              t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white',
            ].join(' ')}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Delete confirm dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-strong p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-content mb-2">Delete source?</h3>
            <p className="text-sm text-content-secondary mb-5">
              This will permanently delete the source and all its ingestion logs.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm rounded border border-base-300 text-content hover:bg-base-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deletingId === confirmDeleteId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-content">Sources</h1>
          <p className="text-sm text-content-secondary mt-0.5">
            Manage ingestion sources for the news aggregation pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as SourceType | '')}
            className="text-sm border border-base-300 rounded px-3 py-2 bg-white text-content focus:outline-none focus:ring-1 focus:ring-brand-gold"
          >
            <option value="">All types</option>
            {SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <Link
            to="/admin/sources/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-primary font-semibold text-sm rounded hover:opacity-90 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Source
          </Link>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : sources.length === 0 ? (
        <EmptyState
          title="No sources yet"
          message="Add your first ingestion source to start collecting property news."
          action={
            <Link
              to="/admin/sources/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-primary font-semibold text-sm rounded hover:opacity-90 transition-opacity"
            >
              Add Source
            </Link>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg shadow-soft overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-primary text-white">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Last Fetch</th>
                  <th className="text-right px-4 py-3 font-medium">Articles</th>
                  <th className="text-right px-4 py-3 font-medium">Errors</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300">
                {sources.map((source) => {
                  const dot = getStatusDot(source);
                  return (
                    <tr key={source.id} className="hover:bg-base-200 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-content">{source.name}</span>
                        {source.market && (
                          <span className="ml-2 text-xs text-content-secondary">{source.market}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE_CLASSES[source.type]}`}>
                          {source.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot.color}`} />
                          <span className="text-content-secondary text-xs">{dot.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-content-secondary">{formatRelative(source.lastFetchAt)}</td>
                      <td className="px-4 py-3 text-right text-content">{source.articleCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={source.errorCount > 0 ? 'text-red-600 font-medium' : 'text-content-secondary'}>
                          {source.errorCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/sources/${source.id}/edit`}
                            className="text-xs px-2.5 py-1 rounded border border-base-300 text-content hover:bg-base-200 transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleToggleActive(source)}
                            disabled={togglingId === source.id}
                            className="text-xs px-2.5 py-1 rounded border border-base-300 text-content hover:bg-base-200 disabled:opacity-50 transition-colors"
                          >
                            {togglingId === source.id ? '...' : source.isActive ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleFetchNow(source)}
                            disabled={fetchingId === source.id || !source.isActive}
                            title={!source.isActive ? 'Source is paused' : 'Trigger immediate fetch'}
                            className="text-xs px-2.5 py-1 rounded border border-brand-gold text-brand-gold hover:bg-brand-gold/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {fetchingId === source.id ? '...' : 'Fetch'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(source.id)}
                            className="text-xs px-2.5 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {sources.map((source) => {
              const dot = getStatusDot(source);
              return (
                <div key={source.id} className="bg-white rounded-lg shadow-soft p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-content text-sm">{source.name}</p>
                      {source.market && (
                        <p className="text-xs text-content-secondary mt-0.5">{source.market}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${TYPE_BADGE_CLASSES[source.type]}`}>
                      {source.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-content-secondary">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${dot.color}`} />
                      {dot.label}
                    </div>
                    <span>{formatRelative(source.lastFetchAt)}</span>
                    <span>{source.articleCount} articles</span>
                    {source.errorCount > 0 && (
                      <span className="text-red-600 font-medium">{source.errorCount} errors</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/admin/sources/${source.id}/edit`}
                      className="text-xs px-3 py-1.5 rounded border border-base-300 text-content hover:bg-base-200 transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleToggleActive(source)}
                      disabled={togglingId === source.id}
                      className="text-xs px-3 py-1.5 rounded border border-base-300 text-content hover:bg-base-200 disabled:opacity-50 transition-colors"
                    >
                      {source.isActive ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleFetchNow(source)}
                      disabled={fetchingId === source.id || !source.isActive}
                      className="text-xs px-3 py-1.5 rounded border border-brand-gold text-brand-gold hover:bg-brand-gold/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Fetch Now
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(source.id)}
                      className="text-xs px-3 py-1.5 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default SourceList;
