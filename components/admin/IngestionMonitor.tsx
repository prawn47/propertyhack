import React, { useState, useEffect, useCallback } from 'react';
import { getDashboard, type DashboardData } from '../../services/adminDashboardService';
import LoadingSpinner from '../shared/LoadingSpinner';

const TYPE_BADGE_CLASSES: Record<string, string> = {
  RSS: 'bg-blue-100 text-blue-800',
  NEWSAPI_ORG: 'bg-purple-100 text-purple-800',
  NEWSAPI_AI: 'bg-indigo-100 text-indigo-800',
  PERPLEXITY: 'bg-teal-100 text-teal-800',
  SCRAPER: 'bg-orange-100 text-orange-800',
  NEWSLETTER: 'bg-pink-100 text-pink-800',
  SOCIAL: 'bg-cyan-100 text-cyan-800',
  MANUAL: 'bg-gray-100 text-gray-800',
};

const LOG_STATUS_CLASSES: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  FAILED: 'bg-red-100 text-red-800',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function getSourceHealth(source: DashboardData['ingestionHealth']['perSource'][0]): { dot: string; label: string } {
  if (!source.isActive) return { dot: 'bg-gray-400', label: 'Paused' };
  if (source.consecutiveFailures > 3) return { dot: 'bg-red-500', label: 'Error' };
  if (source.consecutiveFailures > 0) return { dot: 'bg-yellow-400', label: 'Degraded' };
  return { dot: 'bg-green-500', label: 'Healthy' };
}

interface SummaryCardProps {
  label: string;
  value: number | string;
  sub?: React.ReactNode;
  accent?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, sub, accent }) => (
  <div className={`bg-base-100 rounded-lg border p-4 ${accent ? 'border-brand-gold' : 'border-base-300'}`}>
    <p className="text-xs text-content-secondary uppercase tracking-wide font-medium mb-1">{label}</p>
    <p className={`text-2xl font-bold ${accent ? 'text-brand-gold' : 'text-content'}`}>{value}</p>
    {sub && <div className="mt-1 text-xs text-content-secondary">{sub}</div>}
  </div>
);

const IngestionMonitor: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const load = useCallback(async () => {
    try {
      const result = await getDashboard();
      setData(result);
      setLastRefreshed(new Date());
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
    );
  }

  if (!data) return null;

  const { articles, sources, ingestionHealth, health } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-content">Ingestion Monitor</h1>
          <p className="text-xs text-content-secondary mt-0.5">
            Last refreshed {timeAgo(lastRefreshed.toISOString())} &middot; auto-refreshes every 30s
          </p>
        </div>
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 border border-brand-gold text-brand-gold rounded hover:bg-brand-gold/10 transition-colors"
        >
          Refresh now
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Articles"
          value={articles.total.toLocaleString()}
          accent
          sub={
            <span>
              <span className="font-medium text-content">{articles.last24h}</span> today &middot;{' '}
              <span className="font-medium text-content">{articles.last7d}</span> this week &middot;{' '}
              <span className="font-medium text-content">{articles.last30d}</span> this month
            </span>
          }
        />
        <SummaryCard
          label="Active Sources"
          value={sources.active}
          sub={<span>{sources.total} total &middot; {sources.paused} paused</span>}
        />
        <SummaryCard
          label="Sources with Errors"
          value={health.sourcesWithErrors}
          sub={health.sourcesWithErrors > 0 ? <span className="text-red-600">Needs attention</span> : <span className="text-green-600">All clear</span>}
        />
        <SummaryCard
          label="Stale Sources"
          value={health.staleSources.length}
          sub={health.staleSources.length > 0 ? <span className="text-yellow-600">Not fetched in 24h+</span> : <span className="text-green-600">All up to date</span>}
        />
      </div>

      {/* Articles by status + top categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Articles by status */}
        <div className="bg-base-100 rounded-lg border border-base-300 p-4">
          <h2 className="text-sm font-semibold text-content mb-3">Articles by Status</h2>
          <div className="space-y-2">
            {(['PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((status) => {
              const count = articles.byStatus[status];
              const total = articles.total || 1;
              const pct = Math.round((count / total) * 100);
              const barColor = status === 'PUBLISHED' ? 'bg-green-500' : status === 'DRAFT' ? 'bg-yellow-400' : 'bg-gray-400';
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-content-secondary">{status}</span>
                    <span className="font-medium text-content">{count.toLocaleString()} <span className="text-content-secondary font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-base-200 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top categories */}
        <div className="bg-base-100 rounded-lg border border-base-300 p-4">
          <h2 className="text-sm font-semibold text-content mb-3">Top Categories</h2>
          {articles.byCategory.length === 0 ? (
            <p className="text-xs text-content-secondary">No articles yet</p>
          ) : (
            <div className="space-y-1.5">
              {articles.byCategory.slice(0, 8).map((cat) => (
                <div key={cat.category} className="flex items-center justify-between text-xs">
                  <span className="text-content truncate mr-2">{cat.category || 'Uncategorised'}</span>
                  <span className="font-medium text-content flex-shrink-0 tabular-nums">{cat.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Source health table */}
      <div className="bg-base-100 rounded-lg border border-base-300 overflow-hidden">
        <div className="px-4 py-3 border-b border-base-300">
          <h2 className="text-sm font-semibold text-content">Source Health</h2>
        </div>
        {ingestionHealth.perSource.length === 0 ? (
          <p className="text-xs text-content-secondary p-4">No sources configured</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-base-200 border-b border-base-300">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-secondary">Source</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-secondary">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-secondary">Last Fetch</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-content-secondary">Errors</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-content-secondary">Articles</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-secondary">Last Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-300">
                  {ingestionHealth.perSource.map((source) => {
                    const { dot, label } = getSourceHealth(source);
                    return (
                      <tr key={source.id} className="hover:bg-base-200/50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-content">{source.name}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                            <span className="text-xs text-content-secondary">{label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-content-secondary">{timeAgo(source.lastFetchAt)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={source.consecutiveFailures > 0 ? 'text-red-600 font-medium text-xs' : 'text-content-secondary text-xs'}>
                            {source.consecutiveFailures}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-content">{source.articleCount.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-xs text-content-secondary max-w-xs">
                          {source.lastError ? (
                            <span className="text-red-600" title={source.lastError}>{truncate(source.lastError, 60)}</span>
                          ) : (
                            <span className="text-green-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-base-300">
              {ingestionHealth.perSource.map((source) => {
                const { dot, label } = getSourceHealth(source);
                return (
                  <div key={source.id} className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-content">{source.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                        <span className="text-xs text-content-secondary">{label}</span>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-content-secondary">
                      <span>{timeAgo(source.lastFetchAt)}</span>
                      <span>{source.articleCount} articles</span>
                      {source.consecutiveFailures > 0 && (
                        <span className="text-red-600">{source.consecutiveFailures} errors</span>
                      )}
                    </div>
                    {source.lastError && (
                      <p className="text-xs text-red-600">{truncate(source.lastError, 80)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Recent ingestion logs */}
      <div className="bg-base-100 rounded-lg border border-base-300 overflow-hidden">
        <div className="px-4 py-3 border-b border-base-300">
          <h2 className="text-sm font-semibold text-content">Recent Ingestion Logs</h2>
        </div>
        {ingestionHealth.recentLogs.length === 0 ? (
          <p className="text-xs text-content-secondary p-4">No ingestion logs yet</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-base-200 border-b border-base-300">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-secondary">Source</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-secondary">Status</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-content-secondary">Found</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-content-secondary">New</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-content-secondary">Duration</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-secondary">Time</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-secondary">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-300">
                  {ingestionHealth.recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-base-200/50 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-content">{log.sourceName}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${LOG_STATUS_CLASSES[log.status] || 'bg-gray-100 text-gray-800'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-content tabular-nums">{log.articlesFound}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-content tabular-nums">{log.articlesNew}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-content-secondary tabular-nums">{log.duration}ms</td>
                      <td className="px-4 py-2.5 text-xs text-content-secondary whitespace-nowrap">{timeAgo(log.createdAt)}</td>
                      <td className="px-4 py-2.5 text-xs max-w-xs">
                        {log.errorMessage ? (
                          <span className="text-red-600" title={log.errorMessage}>{truncate(log.errorMessage, 60)}</span>
                        ) : (
                          <span className="text-content-secondary">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-base-300">
              {ingestionHealth.recentLogs.map((log) => (
                <div key={log.id} className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-content font-medium">{log.sourceName}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${LOG_STATUS_CLASSES[log.status] || 'bg-gray-100 text-gray-800'}`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-content-secondary">
                    <span>{log.articlesFound} found</span>
                    <span>{log.articlesNew} new</span>
                    <span>{log.duration}ms</span>
                    <span>{timeAgo(log.createdAt)}</span>
                  </div>
                  {log.errorMessage && (
                    <p className="text-xs text-red-600">{truncate(log.errorMessage, 80)}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default IngestionMonitor;
