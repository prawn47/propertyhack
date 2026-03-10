import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getSource,
  createSource,
  updateSource,
  triggerFetch,
  type IngestionSource,
  type IngestionLog,
  type SourceType,
  type CreateSourceData,
} from '../../services/adminSourceService';
import LoadingSpinner from '../shared/LoadingSpinner';

const SOURCE_TYPES: SourceType[] = [
  'RSS', 'NEWSAPI_ORG', 'NEWSAPI_AI', 'PERPLEXITY',
  'SCRAPER', 'NEWSLETTER', 'SOCIAL', 'MANUAL',
];

const SCHEDULE_OPTIONS = [
  { label: 'Every 15 min', cron: '*/15 * * * *' },
  { label: 'Every 30 min', cron: '*/30 * * * *' },
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Every 6 hours', cron: '0 */6 * * *' },
  { label: 'Every 12 hours', cron: '0 */12 * * *' },
  { label: 'Daily', cron: '0 9 * * *' },
];

const MARKETS = ['AU', 'US', 'UK', 'CA'];

const NEWSAPI_ORG_CATEGORIES = ['business', 'technology', 'general', 'science', 'health', 'sports', 'entertainment'];

// Tag input component
interface TagInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({ values, onChange, placeholder = 'Add and press Enter' }) => {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
    if (e.key === 'Backspace' && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  return (
    <div className="border border-base-300 rounded bg-white px-2 py-1.5 flex flex-wrap gap-1.5 focus-within:ring-1 focus-within:ring-brand-gold">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 bg-brand-primary text-white text-xs px-2 py-0.5 rounded">
          {v}
          <button
            type="button"
            onClick={() => remove(v)}
            className="text-white/60 hover:text-white leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={add}
        placeholder={values.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] outline-none text-sm text-content placeholder:text-content-secondary bg-transparent py-0.5"
      />
    </div>
  );
};

// Multi-select component
interface MultiSelectProps {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, values, onChange }) => {
  const toggle = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter((v) => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={[
            'text-xs px-3 py-1 rounded border transition-colors',
            values.includes(opt)
              ? 'bg-brand-gold border-brand-gold text-brand-primary font-semibold'
              : 'border-base-300 text-content hover:bg-base-200',
          ].join(' ')}
        >
          {opt}
        </button>
      ))}
    </div>
  );
};

function inputClass(hasError = false) {
  return [
    'w-full border rounded px-3 py-2 text-sm text-content focus:outline-none focus:ring-1',
    hasError ? 'border-red-400 focus:ring-red-400' : 'border-base-300 focus:ring-brand-gold',
  ].join(' ');
}

function labelClass() {
  return 'block text-sm font-medium text-content mb-1';
}

interface Toast {
  id: number;
  text: string;
  type: 'success' | 'error';
}

let toastIdCounter = 0;

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-AU', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const SourceEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [fetchError, setFetchError] = useState<'not_found' | 'error' | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [source, setSource] = useState<IngestionSource | null>(null);
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<SourceType>('RSS');
  const [market, setMarket] = useState('AU');
  const [category, setCategory] = useState('');
  const [schedule, setSchedule] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showToast = (text: string, toastType: 'success' | 'error') => {
    const toastId = ++toastIdCounter;
    setToasts((prev) => [...prev, { id: toastId, text, type: toastType }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toastId)), 4000);
  };

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    getSource(id!)
      .then((s) => {
        setSource(s);
        setLogs(s.logs || []);
        setName(s.name);
        setType(s.type);
        setMarket(s.market || 'AU');
        setCategory(s.category || '');
        setSchedule(s.schedule || '');
        setConfig((s.config as Record<string, unknown>) || {});
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : '';
        console.error('[SourceEditor] failed to load source:', err);
        if (msg.includes('404')) {
          setFetchError('not_found');
        } else {
          setFetchError('error');
        }
      })
      .finally(() => setLoading(false));
  }, [id, isNew]);

  // Reset config when type changes (create mode only)
  const handleTypeChange = (newType: SourceType) => {
    setType(newType);
    setConfig({});
  };

  const setConfigField = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (type === 'RSS' && !config.feedUrl) errs.feedUrl = 'Feed URL is required';
    if (type === 'NEWSAPI_ORG') {
      const kw = config.keywords as string[] | undefined;
      if (!kw || kw.length === 0) errs.keywords = 'At least one keyword required';
    }
    if (type === 'NEWSAPI_AI') {
      const kw = config.keywords as string[] | undefined;
      if (!kw || kw.length === 0) errs.keywords = 'At least one keyword required';
    }
    if (type === 'PERPLEXITY') {
      const sq = config.searchQueries as string[] | undefined;
      if (!sq || sq.length === 0) errs.searchQueries = 'At least one search query required';
    }
    if (type === 'SCRAPER' && !config.targetUrl) errs.targetUrl = 'Target URL is required';
    if (type === 'NEWSLETTER' && !config.inboundEmail) errs.inboundEmail = 'Inbound email is required';
    if (type === 'SOCIAL' && !config.platform) errs.platform = 'Platform is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: CreateSourceData = {
        name,
        type,
        config,
        market,
        category: category || undefined,
        schedule: schedule || undefined,
      };
      if (isNew) {
        await createSource(payload);
        showToast('Source created', 'success');
        navigate('/admin/sources');
      } else {
        await updateSource(id!, {
          name,
          config,
          market,
          category: category || undefined,
          schedule: schedule || undefined,
        });
        showToast('Source saved', 'success');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSource = async () => {
    if (!id || isNew) return;
    setTesting(true);
    try {
      await triggerFetch(id);
      showToast('Fetch job queued successfully', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to queue fetch';
      showToast(message, 'error');
    } finally {
      setTesting(false);
    }
  };

  const renderConfigFields = () => {
    switch (type) {
      case 'RSS':
        return (
          <div>
            <label className={labelClass()}>Feed URL <span className="text-red-500">*</span></label>
            <input
              type="url"
              value={(config.feedUrl as string) || ''}
              onChange={(e) => setConfigField('feedUrl', e.target.value)}
              placeholder="https://example.com/feed.xml"
              className={inputClass(!!errors.feedUrl)}
            />
            {errors.feedUrl && <p className="text-red-500 text-xs mt-1">{errors.feedUrl}</p>}
          </div>
        );

      case 'NEWSAPI_ORG':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass()}>Keywords <span className="text-red-500">*</span></label>
              <TagInput
                values={(config.keywords as string[]) || []}
                onChange={(v) => setConfigField('keywords', v)}
                placeholder="Add keyword and press Enter"
              />
              {errors.keywords && <p className="text-red-500 text-xs mt-1">{errors.keywords}</p>}
            </div>
            <div>
              <label className={labelClass()}>Country</label>
              <input
                type="text"
                value={(config.country as string) || 'au'}
                onChange={(e) => setConfigField('country', e.target.value)}
                placeholder="au"
                className={inputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>Category</label>
              <select
                value={(config.category as string) || ''}
                onChange={(e) => setConfigField('category', e.target.value)}
                className={inputClass()}
              >
                <option value="">Any</option>
                {NEWSAPI_ORG_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'NEWSAPI_AI':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass()}>Keywords <span className="text-red-500">*</span></label>
              <TagInput
                values={(config.keywords as string[]) || []}
                onChange={(v) => setConfigField('keywords', v)}
                placeholder="Add keyword and press Enter"
              />
              {errors.keywords && <p className="text-red-500 text-xs mt-1">{errors.keywords}</p>}
            </div>
            <div>
              <label className={labelClass()}>Categories</label>
              <MultiSelect
                options={['Business', 'Technology', 'Finance', 'Real Estate', 'General']}
                values={(config.categories as string[]) || []}
                onChange={(v) => setConfigField('categories', v)}
              />
            </div>
            <div>
              <label className={labelClass()}>Source Locations</label>
              <input
                type="text"
                value={(config.sourceLocations as string) || ''}
                onChange={(e) => setConfigField('sourceLocations', e.target.value)}
                placeholder="Australia"
                className={inputClass()}
              />
            </div>
          </div>
        );

      case 'PERPLEXITY':
        return (
          <div>
            <label className={labelClass()}>Search Queries <span className="text-red-500">*</span></label>
            <TagInput
              values={(config.searchQueries as string[]) || []}
              onChange={(v) => setConfigField('searchQueries', v)}
              placeholder="Add search query and press Enter"
            />
            {errors.searchQueries && <p className="text-red-500 text-xs mt-1">{errors.searchQueries}</p>}
          </div>
        );

      case 'SCRAPER': {
        const selectors = (config.selectors as Record<string, string>) || {};
        const setSelector = (key: string, value: string) => {
          setConfigField('selectors', { ...selectors, [key]: value });
        };
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass()}>Target URL <span className="text-red-500">*</span></label>
              <input
                type="url"
                value={(config.targetUrl as string) || ''}
                onChange={(e) => setConfigField('targetUrl', e.target.value)}
                placeholder="https://example.com/news"
                className={inputClass(!!errors.targetUrl)}
              />
              {errors.targetUrl && <p className="text-red-500 text-xs mt-1">{errors.targetUrl}</p>}
            </div>
            <div className="space-y-2">
              <p className={labelClass()}>CSS Selectors</p>
              {(['articleList', 'title', 'content', 'image', 'link'] as const).map((sel) => (
                <div key={sel} className="flex items-center gap-2">
                  <span className="text-xs text-content-secondary w-24 flex-shrink-0">{sel}</span>
                  <input
                    type="text"
                    value={selectors[sel] || ''}
                    onChange={(e) => setSelector(sel, e.target.value)}
                    placeholder={`.${sel}`}
                    className={inputClass()}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(config.headless as boolean) || false}
                  onChange={(e) => setConfigField('headless', e.target.checked)}
                  className="rounded border-base-300 text-brand-gold focus:ring-brand-gold"
                />
                <span className="text-sm text-content">Headless mode (JavaScript-rendered pages)</span>
              </label>
            </div>
          </div>
        );
      }

      case 'NEWSLETTER':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass()}>Inbound Email</label>
              <input
                type="email"
                value={(config.inboundEmail as string) || ''}
                readOnly={!isNew}
                onChange={(e) => setConfigField('inboundEmail', e.target.value)}
                placeholder="news@ingest.propertyhack.com"
                className={[inputClass(!!errors.inboundEmail), !isNew ? 'bg-base-200 cursor-not-allowed' : ''].join(' ')}
              />
              {!isNew && <p className="text-xs text-content-secondary mt-1">Auto-generated — cannot be changed.</p>}
              {errors.inboundEmail && <p className="text-red-500 text-xs mt-1">{errors.inboundEmail}</p>}
            </div>
            <div>
              <label className={labelClass()}>Allowed Senders</label>
              <TagInput
                values={(config.allowedSenders as string[]) || []}
                onChange={(v) => setConfigField('allowedSenders', v)}
                placeholder="*@domain.com or specific@sender.com"
              />
            </div>
          </div>
        );

      case 'SOCIAL': {
        const platform = (config.platform as string) || '';
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass()}>Platform <span className="text-red-500">*</span></label>
              <select
                value={platform}
                onChange={(e) => {
                  const p = e.target.value;
                  setConfig((prev) => ({ platform: p }));
                  void p;
                }}
                className={inputClass(!!errors.platform)}
              >
                <option value="">Select platform</option>
                <option value="reddit">Reddit</option>
                <option value="twitter">Twitter / X</option>
              </select>
              {errors.platform && <p className="text-red-500 text-xs mt-1">{errors.platform}</p>}
            </div>
            {platform === 'reddit' && (
              <>
                <div>
                  <label className={labelClass()}>Subreddits</label>
                  <TagInput
                    values={(config.subreddits as string[]) || []}
                    onChange={(v) => setConfigField('subreddits', v)}
                    placeholder="AusProperty, AusFinance"
                  />
                </div>
                <div>
                  <label className={labelClass()}>Min Upvotes</label>
                  <input
                    type="number"
                    min={0}
                    value={(config.minUpvotes as number) ?? 10}
                    onChange={(e) => setConfigField('minUpvotes', Number(e.target.value))}
                    className={inputClass()}
                  />
                </div>
              </>
            )}
            {platform === 'twitter' && (
              <>
                <div>
                  <label className={labelClass()}>List ID</label>
                  <input
                    type="text"
                    value={(config.listId as string) || ''}
                    onChange={(e) => setConfigField('listId', e.target.value)}
                    placeholder="Twitter list ID"
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label className={labelClass()}>Hashtags</label>
                  <TagInput
                    values={(config.hashtags as string[]) || []}
                    onChange={(v) => setConfigField('hashtags', v)}
                    placeholder="#ausproperty"
                  />
                </div>
              </>
            )}
          </div>
        );
      }

      case 'MANUAL':
        return (
          <p className="text-sm text-content-secondary italic">No additional config required for manual sources.</p>
        );

      default:
        return null;
    }
  };

  if (loading) return <LoadingSpinner />;

  if (fetchError === 'not_found') {
    return (
      <div className="max-w-2xl">
        <div className="bg-white rounded-lg shadow-soft p-8 text-center space-y-3">
          <p className="text-lg font-semibold text-content">Source not found</p>
          <p className="text-sm text-content-secondary">This source may have been deleted.</p>
          <button
            type="button"
            onClick={() => navigate('/admin/sources')}
            className="inline-block mt-2 text-sm text-brand-gold hover:underline"
          >
            &larr; Back to sources
          </button>
        </div>
      </div>
    );
  }

  if (fetchError === 'error') {
    return (
      <div className="max-w-2xl">
        <div className="bg-white rounded-lg shadow-soft p-8 text-center space-y-3">
          <p className="text-lg font-semibold text-content">Failed to load source</p>
          <p className="text-sm text-content-secondary">An unexpected error occurred. Check the console for details.</p>
          <button
            type="button"
            onClick={() => navigate('/admin/sources')}
            className="inline-block mt-2 text-sm text-brand-gold hover:underline"
          >
            &larr; Back to sources
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Toasts */}
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

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-content">
            {isNew ? 'Add Source' : `Edit: ${source?.name}`}
          </h1>
          <p className="text-sm text-content-secondary mt-0.5">
            {isNew ? 'Configure a new ingestion source.' : 'Update source configuration.'}
          </p>
        </div>
        {!isNew && (
          <button
            type="button"
            onClick={handleTestSource}
            disabled={testing || !source?.isActive}
            title={!source?.isActive ? 'Activate source to test' : 'Trigger immediate fetch'}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-brand-gold text-brand-gold rounded hover:bg-brand-gold/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
                Queuing...
              </>
            ) : 'Test Source'}
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow-soft p-6 space-y-5">
        {/* Source type — create only */}
        {isNew && (
          <div>
            <label className={labelClass()}>Source Type</label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as SourceType)}
              className={inputClass()}
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {/* Common fields */}
        <div>
          <label className={labelClass()}>Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Domain.com.au RSS"
            className={inputClass(!!errors.name)}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass()}>Market</label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className={inputClass()}
            >
              {MARKETS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass()}>Default Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. property"
              className={inputClass()}
            />
          </div>
        </div>

        <div>
          <label className={labelClass()}>Schedule</label>
          <select
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            className={inputClass()}
          >
            <option value="">No schedule</option>
            {SCHEDULE_OPTIONS.map((opt) => (
              <option key={opt.cron} value={opt.cron}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <hr className="border-base-300" />

        {/* Type-specific config */}
        <div>
          <p className="text-sm font-medium text-content mb-3">
            {isNew ? type : source?.type} Configuration
          </p>
          {renderConfigFields()}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/sources')}
            className="px-4 py-2 text-sm border border-base-300 rounded text-content hover:bg-base-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-brand-gold text-brand-primary font-semibold text-sm rounded hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {saving ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
                Saving...
              </>
            ) : isNew ? 'Create Source' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Ingestion logs (edit mode only) */}
      {!isNew && logs.length > 0 && (
        <div className="bg-white rounded-lg shadow-soft overflow-hidden">
          <button
            type="button"
            onClick={() => setLogsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-content hover:bg-base-200 transition-colors"
          >
            <span>Recent Ingestion Logs</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-4 h-4 text-content-secondary transition-transform ${logsOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {logsOpen && (
            <div className="overflow-x-auto border-t border-base-300">
              <table className="w-full text-xs">
                <thead className="bg-base-200 text-content-secondary">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Time</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-right px-4 py-2 font-medium">Found</th>
                    <th className="text-right px-4 py-2 font-medium">New</th>
                    <th className="text-right px-4 py-2 font-medium">Duration</th>
                    <th className="text-left px-4 py-2 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-300">
                  {logs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="hover:bg-base-200">
                      <td className="px-4 py-2 text-content-secondary whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-2">
                        <span className={[
                          'px-1.5 py-0.5 rounded text-xs font-medium',
                          log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                          log.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700',
                        ].join(' ')}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-content">{log.articlesFound}</td>
                      <td className="px-4 py-2 text-right text-content">{log.articlesNew}</td>
                      <td className="px-4 py-2 text-right text-content-secondary">{formatDuration(log.duration)}</td>
                      <td className="px-4 py-2 text-red-600 max-w-xs truncate">{log.errorMessage || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SourceEditor;
