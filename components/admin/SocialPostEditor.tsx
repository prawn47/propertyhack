import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getSocialPost,
  createSocialPost,
  updateSocialPost,
  publishSocialPost,
  type SocialPost,
  type SocialPlatform,
} from '../../services/adminSocialService';
import { getArticles, type Article } from '../../services/adminArticleService';
import LoadingSpinner from '../shared/LoadingSpinner';

const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  twitter: 280,
  facebook: 63206,
  linkedin: 3000,
  instagram: 2200,
};

const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  twitter: 'Twitter / X',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
};

const ALL_PLATFORMS: SocialPlatform[] = ['twitter', 'facebook', 'linkedin', 'instagram'];

function charCountColor(count: number, limit: number): string {
  const ratio = count / limit;
  if (ratio >= 1) return 'text-red-500 font-semibold';
  if (ratio >= 0.9) return 'text-yellow-500';
  return 'text-content-secondary';
}

function formatDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const SocialPostEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [activePreview, setActivePreview] = useState<SocialPlatform | null>(null);

  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(['twitter']);
  const [imageUrl, setImageUrl] = useState('');
  const [articleId, setArticleId] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [scheduledFor, setScheduledFor] = useState('');
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  useEffect(() => {
    getArticles({ status: 'PUBLISHED', limit: 200 })
      .then((res) => setArticles(res.articles))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    getSocialPost(id!)
      .then((post: SocialPost) => {
        setContent(post.content);
        setPlatforms(post.platforms as SocialPlatform[]);
        setImageUrl(post.imageUrl || '');
        setArticleId(post.articleId || '');
        setExistingStatus(post.status);
        if (post.scheduledFor) {
          setScheduleMode('schedule');
          setScheduledFor(formatDatetimeLocal(post.scheduledFor));
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const togglePlatform = (platform: SocialPlatform) => {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const isReadOnly = existingStatus === 'PUBLISHED' || existingStatus === 'FAILED';

  const handleSaveDraft = async () => {
    if (!content.trim()) { setError('Content is required'); return; }
    if (platforms.length === 0) { setError('Select at least one platform'); return; }
    setSaving(true);
    setError(null);
    try {
      const data = {
        content,
        platforms,
        imageUrl: imageUrl || null,
        articleId: articleId || null,
        scheduledFor: scheduleMode === 'schedule' && scheduledFor ? new Date(scheduledFor).toISOString() : null,
      };
      if (isNew) {
        const post = await createSocialPost(data);
        navigate(`/admin/social/${post.id}`, { replace: true });
      } else {
        await updateSocialPost(id!, data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!content.trim()) { setError('Content is required'); return; }
    if (platforms.length === 0) { setError('Select at least one platform'); return; }
    setPublishing(true);
    setError(null);
    try {
      const data = {
        content,
        platforms,
        imageUrl: imageUrl || null,
        articleId: articleId || null,
        scheduledFor: scheduleMode === 'schedule' && scheduledFor ? new Date(scheduledFor).toISOString() : null,
      };

      let postId = id;
      if (isNew) {
        const created = await createSocialPost(data);
        postId = created.id;
      } else {
        await updateSocialPost(id!, data);
      }

      if (scheduleMode === 'now') {
        await publishSocialPost(postId!);
      }

      navigate('/admin/social');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const getPreviewContent = (platform: SocialPlatform): string => {
    const limit = PLATFORM_LIMITS[platform];
    if (content.length <= limit) return content;
    return content.slice(0, limit - 1) + '…';
  };

  const maxLimitForSelectedPlatforms = platforms.length > 0
    ? Math.min(...platforms.map((p) => PLATFORM_LIMITS[p]))
    : Infinity;

  const contentLen = content.length;
  const isOverLimit = contentLen > maxLimitForSelectedPlatforms;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/social')}
          className="p-1.5 rounded text-content-secondary hover:text-content hover:bg-base-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-content">{isNew ? 'New Post' : 'Edit Post'}</h1>
        {existingStatus && (
          <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            existingStatus === 'PUBLISHED' ? 'bg-green-800 text-green-200' :
            existingStatus === 'FAILED' ? 'bg-red-800 text-red-200' :
            existingStatus === 'SCHEDULED' ? 'bg-blue-800 text-blue-200' :
            'bg-gray-700 text-gray-200'
          }`}>
            {existingStatus.charAt(0) + existingStatus.slice(1).toLowerCase()}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Content */}
        <div className="bg-base-100 rounded-lg shadow-soft p-5">
          <label className="block text-sm font-semibold text-content mb-2">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isReadOnly}
            rows={6}
            placeholder="Write your post content here…"
            className="w-full text-sm border border-base-300 rounded px-3 py-2 text-content placeholder-content-secondary focus:outline-none focus:ring-2 focus:ring-brand-gold resize-y disabled:opacity-60 disabled:bg-base-200"
          />
          <div className="mt-2 flex flex-wrap gap-3">
            {ALL_PLATFORMS.filter((p) => platforms.includes(p)).map((platform) => {
              const limit = PLATFORM_LIMITS[platform];
              return (
                <span key={platform} className={`text-xs ${charCountColor(contentLen, limit)}`}>
                  {PLATFORM_NAMES[platform]}: {contentLen}/{limit}
                </span>
              );
            })}
            {platforms.length === 0 && (
              <span className="text-xs text-content-secondary">Select platforms to see character limits</span>
            )}
          </div>
          {isOverLimit && (
            <p className="mt-1 text-xs text-red-500">
              Content exceeds the limit for one or more selected platforms. It will be truncated in preview.
            </p>
          )}
        </div>

        {/* Platforms */}
        <div className="bg-base-100 rounded-lg shadow-soft p-5">
          <label className="block text-sm font-semibold text-content mb-3">Platforms</label>
          <div className="flex flex-wrap gap-3">
            {ALL_PLATFORMS.map((platform) => {
              const checked = platforms.includes(platform);
              return (
                <label
                  key={platform}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors select-none ${
                    checked
                      ? 'border-brand-gold bg-yellow-50 text-content'
                      : 'border-base-300 text-content-secondary hover:border-brand-gold hover:text-content'
                  } ${isReadOnly ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePlatform(platform)}
                    disabled={isReadOnly}
                    className="accent-brand-gold"
                  />
                  <span className="text-sm font-medium">{PLATFORM_NAMES[platform]}</span>
                  <span className="text-xs text-content-secondary">
                    {PLATFORM_LIMITS[platform].toLocaleString()} chars
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Image URL */}
        <div className="bg-base-100 rounded-lg shadow-soft p-5">
          <label className="block text-sm font-semibold text-content mb-2">Image URL (optional)</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={isReadOnly}
            placeholder="https://example.com/image.jpg"
            className="w-full text-sm border border-base-300 rounded px-3 py-2 text-content placeholder-content-secondary focus:outline-none focus:ring-2 focus:ring-brand-gold disabled:opacity-60 disabled:bg-base-200"
          />
          {imageUrl && (
            <div className="mt-3">
              <img
                src={imageUrl}
                alt="Preview"
                className="h-32 w-auto rounded border border-base-300 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>

        {/* Article Link */}
        <div className="bg-base-100 rounded-lg shadow-soft p-5">
          <label className="block text-sm font-semibold text-content mb-2">Link to Article (optional)</label>
          <select
            value={articleId}
            onChange={(e) => setArticleId(e.target.value)}
            disabled={isReadOnly}
            className="w-full text-sm border border-base-300 rounded px-3 py-2 text-content bg-base-100 focus:outline-none focus:ring-2 focus:ring-brand-gold disabled:opacity-60 disabled:bg-base-200"
          >
            <option value="">No article linked</option>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>

        {/* Schedule */}
        <div className="bg-base-100 rounded-lg shadow-soft p-5">
          <label className="block text-sm font-semibold text-content mb-3">Timing</label>
          <div className="flex gap-3 mb-3">
            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
              scheduleMode === 'now' ? 'border-brand-gold bg-yellow-50' : 'border-base-300 hover:border-brand-gold'
            } ${isReadOnly ? 'opacity-60 pointer-events-none' : ''}`}>
              <input
                type="radio"
                name="scheduleMode"
                value="now"
                checked={scheduleMode === 'now'}
                onChange={() => setScheduleMode('now')}
                disabled={isReadOnly}
                className="accent-brand-gold"
              />
              <span className="text-sm font-medium text-content">Post Now</span>
            </label>
            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
              scheduleMode === 'schedule' ? 'border-brand-gold bg-yellow-50' : 'border-base-300 hover:border-brand-gold'
            } ${isReadOnly ? 'opacity-60 pointer-events-none' : ''}`}>
              <input
                type="radio"
                name="scheduleMode"
                value="schedule"
                checked={scheduleMode === 'schedule'}
                onChange={() => setScheduleMode('schedule')}
                disabled={isReadOnly}
                className="accent-brand-gold"
              />
              <span className="text-sm font-medium text-content">Schedule</span>
            </label>
          </div>
          {scheduleMode === 'schedule' && (
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              disabled={isReadOnly}
              className="text-sm border border-base-300 rounded px-3 py-2 text-content focus:outline-none focus:ring-2 focus:ring-brand-gold disabled:opacity-60 disabled:bg-base-200"
            />
          )}
        </div>

        {/* Per-platform preview */}
        {content && platforms.length > 0 && (
          <div className="bg-base-100 rounded-lg shadow-soft p-5">
            <label className="block text-sm font-semibold text-content mb-3">Preview</label>
            <div className="flex gap-2 mb-3 flex-wrap">
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setActivePreview(activePreview === p ? null : p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    activePreview === p
                      ? 'border-brand-gold bg-yellow-50 text-content'
                      : 'border-base-300 text-content-secondary hover:border-brand-gold'
                  }`}
                >
                  {PLATFORM_NAMES[p]}
                </button>
              ))}
            </div>
            {activePreview && (
              <div className="bg-base-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-content-secondary uppercase tracking-wide">
                    {PLATFORM_NAMES[activePreview]} Preview
                  </span>
                  <span className={`text-xs ${charCountColor(contentLen, PLATFORM_LIMITS[activePreview])}`}>
                    {contentLen}/{PLATFORM_LIMITS[activePreview]}
                  </span>
                </div>
                <p className="text-sm text-content whitespace-pre-wrap break-words">
                  {getPreviewContent(activePreview)}
                </p>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Attached image"
                    className="mt-3 h-40 w-full rounded object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {!isReadOnly && (
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSaveDraft}
              disabled={saving || publishing}
              className="px-4 py-2 rounded border border-base-300 text-sm font-medium text-content hover:bg-base-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              Save as Draft
            </button>
            <button
              onClick={handlePublish}
              disabled={saving || publishing || platforms.length === 0}
              className="px-4 py-2 rounded bg-brand-gold text-brand-primary text-sm font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {publishing && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              {scheduleMode === 'schedule' ? 'Save & Schedule' : 'Publish Now'}
            </button>
            <button
              onClick={() => navigate('/admin/social')}
              disabled={saving || publishing}
              className="px-4 py-2 rounded text-sm text-content-secondary hover:text-content transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}

        {isReadOnly && (
          <div className="pt-1">
            <button
              onClick={() => navigate('/admin/social')}
              className="px-4 py-2 rounded border border-base-300 text-sm font-medium text-content hover:bg-base-200 transition-colors"
            >
              Back to Posts
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialPostEditor;
