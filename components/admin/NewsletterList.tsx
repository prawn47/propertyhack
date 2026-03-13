import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNewsletters,
  deleteNewsletter,
  generateNewsletter,
  NewsletterDraft,
  NewsletterCadence,
} from '../../services/adminNewsletterService';
import LoadingSpinner from '../shared/LoadingSpinner';
import EmptyState from '../shared/EmptyState';

const JURISDICTIONS = ['All', 'AU', 'NZ', 'UK', 'US', 'CA'] as const;
type JurisdictionTab = typeof JURISDICTIONS[number];

const CADENCES: { value: 'All' | NewsletterCadence; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'EDITORIAL', label: 'Editorial' },
  { value: 'WEEKLY_ROUNDUP', label: 'Roundup' },
];

const GENERATE_CADENCES: { value: NewsletterCadence; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'EDITORIAL', label: 'Editorial' },
  { value: 'WEEKLY_ROUNDUP', label: 'Roundup' },
];

const STATUS_BADGES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  APPROVED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-green-100 text-green-700',
};

const CADENCE_BADGES: Record<string, string> = {
  DAILY: 'bg-gray-100 text-gray-600',
  EDITORIAL: 'bg-brand-gold/15 text-brand-gold',
  WEEKLY_ROUNDUP: 'bg-blue-100 text-blue-600',
};

const CADENCE_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  EDITORIAL: 'Editorial',
  WEEKLY_ROUNDUP: 'Roundup',
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
  return str.length > max ? str.slice(0, max) + '\u2026' : str;
}

const NewsletterList: React.FC = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<NewsletterDraft[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<JurisdictionTab>('All');
  const [cadenceFilter, setCadenceFilter] = useState<'All' | NewsletterCadence>('All');
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { page: number; limit: number; jurisdiction?: string; cadence?: NewsletterCadence } = { page, limit: 20 };
      if (activeTab !== 'All') params.jurisdiction = activeTab;
      if (cadenceFilter !== 'All') params.cadence = cadenceFilter;
      const data = await getNewsletters(params);
      setDrafts(data.drafts);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load newsletters');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, cadenceFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [activeTab, cadenceFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this newsletter draft? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deleteNewsletter(id);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete newsletter');
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerate = async (jurisdiction: string, cadence: NewsletterCadence) => {
    const key = `${jurisdiction}-${cadence}`;
    setGeneratingFor(key);
    setError(null);
    setSuccessMsg(null);
    try {
      await generateNewsletter(jurisdiction, cadence);
      setSuccessMsg(`Generation triggered for ${jurisdiction} (${CADENCE_LABELS[cadence]}). Draft will appear shortly.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to trigger generation');
    } finally {
      setGeneratingFor(null);
    }
  };

  const activeJurisdictions = JURISDICTIONS.filter(j => j !== 'All') as string[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-content">Newsletters</h1>
        <span className="text-sm text-content-secondary">{total} total</span>
      </div>

      {/* Jurisdiction filter tabs */}
      <div className="flex items-center gap-1 border-b border-base-300 overflow-x-auto">
        {JURISDICTIONS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-content-secondary hover:text-content',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Cadence filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-content-secondary uppercase tracking-wide">Cadence:</span>
        <div className="flex items-center gap-1">
          {CADENCES.map(c => (
            <button
              key={c.value}
              onClick={() => setCadenceFilter(c.value)}
              className={[
                'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                cadenceFilter === c.value
                  ? 'bg-brand-gold text-brand-primary'
                  : 'bg-base-200 text-content-secondary hover:bg-base-300',
              ].join(' ')}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Now buttons — one per jurisdiction × cadence */}
      <div className="flex flex-wrap gap-2">
        {(activeTab === 'All' ? activeJurisdictions : [activeTab]).map(jur => (
          <div key={jur} className="flex items-center gap-1">
            <span className="text-xs font-semibold text-content-secondary mr-1">{jur}</span>
            {GENERATE_CADENCES.map(c => {
              const key = `${jur}-${c.value}`;
              return (
                <button
                  key={key}
                  onClick={() => handleGenerate(jur, c.value)}
                  disabled={generatingFor === key}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-brand-gold text-brand-primary rounded font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {generatingFor === key ? (
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  {c.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">{successMsg}</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : drafts.length === 0 ? (
        <EmptyState
          title="No newsletter drafts"
          message={activeTab === 'All' ? 'Use "Generate" to create your first newsletter draft.' : `No drafts for ${activeTab}. Use "Generate ${activeTab}" to create one.`}
        />
      ) : (
        <>
          <div className="bg-base-100 rounded border border-base-300 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-base-200 border-b border-base-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Subject</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Jurisdiction</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Cadence</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Generated</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300">
                {drafts.map(draft => (
                  <tr key={draft.id} className="hover:bg-base-200/50">
                    <td className="px-3 py-2.5 max-w-xs">
                      <span className="font-medium text-content">{truncate(draft.subject || '(No subject)', 70)}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-brand-primary/10 text-brand-primary">
                        {draft.jurisdiction}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CADENCE_BADGES[draft.cadence] || 'bg-gray-100 text-gray-600'}`}>
                        {CADENCE_LABELS[draft.cadence] || draft.cadence}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-content-secondary text-xs whitespace-nowrap">
                      {timeAgo(draft.generatedAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGES[draft.status] || 'bg-gray-100 text-gray-600'}`}>
                        {draft.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/admin/newsletters/${draft.id}/edit`)}
                          className="text-xs px-2 py-1 rounded text-brand-gold hover:bg-brand-gold/10 transition-colors font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(draft.id)}
                          disabled={deletingId === draft.id}
                          className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 transition-colors"
                        >
                          {deletingId === draft.id ? 'Deleting\u2026' : 'Delete'}
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

export default NewsletterList;
