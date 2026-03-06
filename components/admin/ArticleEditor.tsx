import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getArticle, updateArticle, Article, ArticleUpdateData } from '../../services/adminArticleService';
import LoadingSpinner from '../shared/LoadingSpinner';

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

const ArticleEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [needsReembedding, setNeedsReembedding] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const [title, setTitle] = useState('');
  const [shortBlurb, setShortBlurb] = useState('');
  const [longSummary, setLongSummary] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [market, setMarket] = useState('AU');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [isFeatured, setIsFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAltText, setImageAltText] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getArticle(id)
      .then(data => {
        setArticle(data);
        setTitle(data.title);
        setShortBlurb(data.shortBlurb);
        setLongSummary(data.longSummary);
        setCategory(data.category);
        setLocation(data.location || '');
        setMarket(data.market);
        setStatus(data.status);
        setIsFeatured(data.isFeatured);
        setImageUrl(data.imageUrl || '');
        setImageAltText(data.imageAltText || '');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const blurbWordCount = shortBlurb.trim() ? shortBlurb.trim().split(/\s+/).length : 0;
  const summaryWordCount = longSummary.trim() ? longSummary.trim().split(/\s+/).length : 0;

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const data: ArticleUpdateData = {
        title,
        shortBlurb,
        longSummary,
        category,
        location,
        market,
        status,
        isFeatured,
        imageUrl: imageUrl || null,
        imageAltText,
      };
      const updated = await updateArticle(id, data);
      setArticle(updated);
      setNeedsReembedding(!!updated.needsReembedding);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error && !article) {
    return (
      <div className="space-y-4">
        <Link to="/admin/articles" className="text-sm text-content-secondary hover:text-brand-accent">
          Back to articles
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/admin/articles" className="text-sm text-content-secondary hover:text-brand-accent flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to articles
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          {saveSuccess && (
            <span className="text-sm text-green-600 font-medium">Saved</span>
          )}
          {needsReembedding && (
            <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-300 px-2 py-1 rounded">
              Needs re-embedding
            </span>
          )}
          <button
            onClick={() => navigate('/admin/articles')}
            className="px-4 py-2 text-sm border border-base-300 rounded bg-base-100 hover:border-brand-gold text-content"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-brand-gold text-brand-primary rounded font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}

      {article?.sourceUrl && (
        <div className="bg-base-200 border border-base-300 rounded px-4 py-3 text-sm">
          <span className="text-content-secondary">Source: </span>
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-accent hover:underline break-all"
          >
            {article.sourceUrl}
          </a>
        </div>
      )}

      <div className="bg-base-100 border border-base-300 rounded divide-y divide-base-300">
        {/* Title */}
        <div className="px-4 py-4 space-y-1">
          <label className="block text-sm font-medium text-content">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-base-300 rounded px-3 py-2 text-sm text-content bg-base-100 focus:outline-none focus:border-brand-gold"
          />
        </div>

        {/* Short Blurb */}
        <div className="px-4 py-4 space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-content">Short Blurb</label>
            <span className={`text-xs ${blurbWordCount > 60 ? 'text-red-500' : 'text-content-secondary'}`}>
              {blurbWordCount} words (target ~50)
            </span>
          </div>
          <textarea
            value={shortBlurb}
            onChange={e => setShortBlurb(e.target.value)}
            rows={3}
            className="w-full border border-base-300 rounded px-3 py-2 text-sm text-content bg-base-100 focus:outline-none focus:border-brand-gold resize-y"
          />
        </div>

        {/* Long Summary */}
        <div className="px-4 py-4 space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-content">Long Summary</label>
            <span className={`text-xs ${summaryWordCount > 400 ? 'text-red-500' : 'text-content-secondary'}`}>
              {summaryWordCount} words (target ~300)
            </span>
          </div>
          <textarea
            value={longSummary}
            onChange={e => setLongSummary(e.target.value)}
            rows={10}
            className="w-full border border-base-300 rounded px-3 py-2 text-sm text-content bg-base-100 focus:outline-none focus:border-brand-gold resize-y"
          />
        </div>

        {/* Category + Location + Market */}
        <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-content">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-base-300 rounded px-3 py-2 text-sm text-content bg-base-100 focus:outline-none focus:border-brand-gold"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-content">Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Sydney, NSW"
              className="w-full border border-base-300 rounded px-3 py-2 text-sm text-content bg-base-100 focus:outline-none focus:border-brand-gold"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-content">Market</label>
            <select
              value={market}
              onChange={e => setMarket(e.target.value)}
              className="w-full border border-base-300 rounded px-3 py-2 text-sm text-content bg-base-100 focus:outline-none focus:border-brand-gold"
            >
              {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Status + Featured */}
        <div className="px-4 py-4 flex flex-wrap gap-6 items-center">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-content">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED')}
              className="border border-base-300 rounded px-3 py-2 text-sm text-content bg-base-100 focus:outline-none focus:border-brand-gold"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={e => setIsFeatured(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-base-300 rounded-full peer peer-checked:bg-brand-gold transition-colors"></div>
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
            </label>
            <span className="text-sm font-medium text-content flex items-center gap-1">
              <svg className="w-4 h-4 text-brand-gold" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Featured
            </span>
          </div>
        </div>

        {/* Image URL + Alt */}
        <div className="px-4 py-4 space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-content">Image URL</label>
            <input
              type="text"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-base-300 rounded px-3 py-2 text-sm text-content bg-base-100 focus:outline-none focus:border-brand-gold"
            />
          </div>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={imageAltText || 'preview'}
              className="h-32 w-auto rounded border border-base-300 object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-content">Image Alt Text</label>
            <input
              type="text"
              value={imageAltText}
              onChange={e => setImageAltText(e.target.value)}
              className="w-full border border-base-300 rounded px-3 py-2 text-sm text-content bg-base-100 focus:outline-none focus:border-brand-gold"
            />
          </div>
        </div>
      </div>

      {/* Original content collapsible */}
      {article?.originalContent && (
        <div className="border border-base-300 rounded">
          <button
            onClick={() => setShowOriginal(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-content hover:bg-base-200/50 rounded"
          >
            <span>View Original Content</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-4 h-4 transition-transform ${showOriginal ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showOriginal && (
            <div className="px-4 pb-4 border-t border-base-300">
              <pre className="text-xs text-content-secondary mt-3 whitespace-pre-wrap font-sans max-h-64 overflow-y-auto bg-base-200 rounded p-3">
                {article.originalContent}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArticleEditor;
