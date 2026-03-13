import React, { useState, useEffect, useCallback } from 'react';
import { getAuditLog, AuditLogEntry, listKeys } from '../../services/adminAgentService';
import LoadingSpinner from '../shared/LoadingSpinner';
import EmptyState from '../shared/EmptyState';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-purple-100 text-purple-700',
};

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return 'bg-green-100 text-green-700';
  if (status >= 400 && status < 500) return 'bg-amber-100 text-amber-700';
  if (status >= 500) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

const AgentAuditLog: React.FC = () => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [keyNames, setKeyNames] = useState<string[]>([]);
  const [filterKeyName, setFilterKeyName] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  useEffect(() => {
    listKeys()
      .then(keys => setKeyNames(keys.map(k => k.name)))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLog({
        page,
        limit: 30,
        keyName: filterKeyName || undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined,
      });
      setEntries(data.entries);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, filterKeyName, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filterKeyName, filterFrom, filterTo]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-content">Agent Audit Log</h1>
        <span className="text-sm text-content-secondary">{total} entries</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-base-100 rounded border border-base-300 p-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-content-secondary">API Key</label>
          <select
            value={filterKeyName}
            onChange={e => setFilterKeyName(e.target.value)}
            className="px-3 py-1.5 text-sm border border-base-300 rounded bg-base-100 focus:border-brand-gold focus:outline-none"
          >
            <option value="">All keys</option>
            {keyNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-content-secondary">From</label>
          <input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            className="px-3 py-1.5 text-sm border border-base-300 rounded bg-base-100 focus:border-brand-gold focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-content-secondary">To</label>
          <input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="px-3 py-1.5 text-sm border border-base-300 rounded bg-base-100 focus:border-brand-gold focus:outline-none"
          />
        </div>
        {(filterKeyName || filterFrom || filterTo) && (
          <button
            onClick={() => {
              setFilterKeyName('');
              setFilterFrom('');
              setFilterTo('');
            }}
            className="px-3 py-1.5 text-sm text-content-secondary hover:text-content transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No audit log entries"
          message={filterKeyName || filterFrom || filterTo
            ? 'No entries match the current filters.'
            : 'Agent API audit log entries will appear here once API keys are used.'}
        />
      ) : (
        <>
          <div className="bg-base-100 rounded border border-base-300 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-base-200 border-b border-base-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Timestamp</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Key Name</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Method</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Path</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-base-200/50">
                    <td className="px-3 py-2.5 text-xs text-content-secondary whitespace-nowrap">
                      {formatTimestamp(entry.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-content font-medium whitespace-nowrap">
                      {entry.agentKeyName}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${METHOD_COLORS[entry.method] || 'bg-gray-100 text-gray-600'}`}>
                        {entry.method}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-content font-mono text-xs max-w-xs truncate">
                      {entry.path}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${statusColor(entry.responseStatus)}`}>
                        {entry.responseStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-content-secondary text-xs whitespace-nowrap">
                      {entry.durationMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

export default AgentAuditLog;
