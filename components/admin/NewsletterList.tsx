import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNewsletters,
  getNewsletterHistory,
  deleteNewsletter,
  generateNewsletter,
  NewsletterDraft,
  NewsletterHistoryItem,
  NewsletterHistoryResponse,
  NewsletterStatus,
} from '../../services/adminNewsletterService';
import LoadingSpinner from '../shared/LoadingSpinner';
import EmptyState from '../shared/EmptyState';

const JURISDICTIONS = ['ALL', 'AU', 'NZ', 'UK', 'US', 'CA'];

const JURISDICTION_LABELS: Record<string, string> = {
  ALL: 'All',
  AU: 'Australia',
  NZ: 'New Zealand',
  UK: 'United Kingdom',
  US: 'United States',
  CA: 'Canada',
};

const STATUS_BADGES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  APPROVED: 'bg-green-100 text-green-700',
  SENT: 'bg-blue-100 text-blue-700',
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPct(value: number | null): string {
  if (value === null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

type ActiveTab = 'drafts' | 'history';

const NewsletterList: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('drafts');

  // Drafts tab state
  const [drafts, setDrafts] = useState<NewsletterDraft[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<NewsletterStatus | ''>('');

  // History tab state
  const [historyData, setHistoryData] = useState<NewsletterHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Shared state
  const [error, setError] = useState<string | null>(null);
  const [jurisdiction, setJurisdiction] = useState('ALL');
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    setDraftsLoading(true);
    setError(null);
    try {
      const params: { page: number; limit: number; jurisdiction?: string; status?: NewsletterStatus } = {
        page,
        limit: 20,
      };
      if (jurisdiction !== 'ALL') params.jurisdiction = jurisdiction;
      if (filterStatus) params.status = filterStatus;
      const data = await getNewsletters(params);
      setDrafts(data.drafts);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load newsletters');
    } finally {
      setDraftsLoading(false);
    }
  }, [page, jurisdiction, filterStatus]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setError(null);
    try {
      const data = await getNewsletterHistory(jurisdiction !== 'ALL' ? jurisdiction : undefined);
      setHistoryData(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load newsletter history');
    } finally {
      setHistoryLoading(false);
    }
  }, [jurisdiction]);

  useEffect(() => {
    if (activeTab === 'drafts') loadDrafts();
  }, [activeTab, loadDrafts]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, loadHistory]);

  useEffect(() => { setPage(1); }, [jurisdiction, filterStatus]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this newsletter draft?')) return;
    try {
      await deleteNewsletter(id);
      await loadDrafts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleGenerate = async (j: string) => {
    setGeneratingFor(j);
    try {
      const { draft } = await generateNewsletter(j);
      navigate(`/admin/newsletters/${draft.id}/edit`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGeneratingFor(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-content">Newsletters</h1>
        {activeTab === 'drafts' && (
          <span className="text-sm text-content-secondary">{total} drafts</span>
        )}
      </div>

      {/* Main tabs: Drafts / History */}
      <div className="flex items-center gap-1 border-b border-base-300">
        {(['drafts', 'history'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-content-secondary hover:text-content',
            ].join(' ')}
          >
            {tab === 'drafts' ? 'Drafts' : 'History'}
          </button>
        ))}
      </div>

      {/* Jurisdiction tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {JURISDICTIONS.map((j) => (
          <button
            key={j}
            onClick={() => setJurisdiction(j)}
            className={[
              'px-3 py-1.5 rounded text-sm font-medium transition-colors',
              jurisdiction === j
                ? 'bg-brand-gold text-brand-primary'
                : 'bg-base-200 text-content-secondary hover:text-content',
            ].join(' ')}
          >
            {JURISDICTION_LABELS[j] || j}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}

      {/* Drafts tab */}
      {activeTab === 'drafts' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as NewsletterStatus | '')}
              className="border border-base-300 rounded px-3 py-1.5 text-sm bg-base-100 text-content focus:outline-none focus:border-brand-gold"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
              <option value="SENT">Sent</option>
            </select>

            <div className="ml-auto flex items-center gap-2">
              {(jurisdiction === 'ALL' ? ['AU', 'NZ', 'UK', 'US', 'CA'] : [jurisdiction]).map((j) => (
                <button
                  key={j}
                  onClick={() => handleGenerate(j)}
                  disabled={generatingFor === j}
                  className="px-3 py-1.5 text-sm bg-brand-primary text-white rounded font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {generatingFor === j ? 'Creating…' : `+ ${j}`}
                </button>
              ))}
            </div>
          </div>

          {draftsLoading ? (
            <LoadingSpinner />
          ) : drafts.length === 0 ? (
            <EmptyState title="No newsletters found" message="Generate a newsletter to get started." />
          ) : (
            <>
              <div className="bg-base-100 rounded border border-base-300 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-base-200 border-b border-base-300">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-content-secondary">Subject</th>
                      <th className="px-4 py-2 text-left font-medium text-content-secondary">Market</th>
                      <th className="px-4 py-2 text-left font-medium text-content-secondary">Status</th>
                      <th className="px-4 py-2 text-left font-medium text-content-secondary">Generated</th>
                      <th className="px-4 py-2 text-left font-medium text-content-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-300">
                    {drafts.map((draft) => (
                      <tr key={draft.id} className="hover:bg-base-200/50">
                        <td className="px-4 py-3 max-w-xs">
                          <button
                            onClick={() => navigate(`/admin/newsletters/${draft.id}/edit`)}
                            className="text-left text-content hover:text-brand-accent font-medium truncate block max-w-xs"
                          >
                            {draft.subject}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-content-secondary text-xs">
                          {JURISDICTION_LABELS[draft.jurisdiction] || draft.jurisdiction}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGES[draft.status] || 'bg-gray-100 text-gray-600'}`}>
                            {draft.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-content-secondary text-xs whitespace-nowrap">
                          {timeAgo(draft.generatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => navigate(`/admin/newsletters/${draft.id}/edit`)}
                              className="text-xs px-2 py-1 bg-brand-gold text-brand-primary rounded font-medium hover:opacity-90"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(draft.id)}
                              className="text-xs px-2 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                  <span className="text-sm text-content-secondary">
                    Page {page} of {totalPages}
                  </span>
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
        </>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <>
          {historyLoading ? (
            <LoadingSpinner />
          ) : !historyData || historyData.drafts.length === 0 ? (
            <EmptyState title="No sent newsletters" message="Sent newsletters will appear here with Beehiiv stats." />
          ) : (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-base-100 rounded border border-base-300 px-4 py-3">
                  <div className="text-xs text-content-secondary uppercase tracking-wide mb-1">Total Sent</div>
                  <div className="text-2xl font-semibold text-content">{historyData.aggregate.totalSent}</div>
                </div>
                <div className="bg-base-100 rounded border border-base-300 px-4 py-3">
                  <div className="text-xs text-content-secondary uppercase tracking-wide mb-1">Avg Open Rate</div>
                  <div className="text-2xl font-semibold text-content">
                    {formatPct(historyData.aggregate.avgOpenRate)}
                  </div>
                </div>
                <div className="bg-base-100 rounded border border-base-300 px-4 py-3">
                  <div className="text-xs text-content-secondary uppercase tracking-wide mb-1">Avg Click Rate</div>
                  <div className="text-2xl font-semibold text-content">
                    {formatPct(historyData.aggregate.avgClickRate)}
                  </div>
                </div>
              </div>

              {/* History table */}
              <div className="bg-base-100 rounded border border-base-300 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-base-200 border-b border-base-300">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-content-secondary">Subject</th>
                      <th className="px-4 py-2 text-left font-medium text-content-secondary">Market</th>
                      <th className="px-4 py-2 text-left font-medium text-content-secondary">Sent</th>
                      <th className="px-4 py-2 text-left font-medium text-content-secondary">Open Rate</th>
                      <th className="px-4 py-2 text-left font-medium text-content-secondary">Click Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-300">
                    {historyData.drafts.map((item: NewsletterHistoryItem) => {
                      const openRate = item.stats && item.stats.subscribers_sent_to > 0
                        ? item.stats.opens / item.stats.subscribers_sent_to
                        : null;
                      const clickRate = item.stats && item.stats.subscribers_sent_to > 0
                        ? item.stats.clicks / item.stats.subscribers_sent_to
                        : null;

                      return (
                        <tr key={item.id} className="hover:bg-base-200/50">
                          <td className="px-4 py-3 max-w-xs">
                            <span className="text-content font-medium truncate block max-w-xs">
                              {item.subject}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                              {item.jurisdiction}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-content-secondary text-xs whitespace-nowrap">
                            {formatDate(item.sentAt)}
                          </td>
                          <td className="px-4 py-3 text-content text-sm font-medium">
                            {formatPct(openRate)}
                          </td>
                          <td className="px-4 py-3 text-content text-sm font-medium">
                            {formatPct(clickRate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default NewsletterList;
