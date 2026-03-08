import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getSocialPost,
  createSocialPost,
  updateSocialPost,
  publishSocialPost,
  retrySocialPost,
  approveSocialPost,
  type SocialPost,
  type SocialPlatform,
  type SocialPostStatus,
} from '../../../services/adminSocialService';
import { getArticles, type Article } from '../../../services/adminArticleService';
import LoadingSpinner from '../../shared/LoadingSpinner';

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

const PLATFORM_HINTS: Record<SocialPlatform, string> = {
  twitter: 'Short, punchy. Links count as 23 chars. 2–3 hashtags max.',
  facebook: 'Longer form OK. Links auto-preview. Hashtags optional.',
  linkedin: 'Professional tone. 3,000 char limit. Hashtags boost reach.',
  instagram: 'Image-led. "Link in bio" for URLs. 5–10 hashtags recommended.',
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

function extractHashtags(text: string): string[] {
  return (text.match(/#\w+/g) || []);
}

function useCountdown(scheduledFor: string | null): string | null {
  const [countdown, setCountdown] = useState<string | null>(null);

  const compute = useCallback(() => {
    if (!scheduledFor) return null;
    const diff = new Date(scheduledFor).getTime() - Date.now();
    if (diff <= 0) return 'Publishing now…';
    const totalMins = Math.floor(diff / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours > 0) return `Publishing in ${hours}h ${mins}m`;
    return `Publishing in ${mins} minute${mins !== 1 ? 's' : ''}`;
  }, [scheduledFor]);

  useEffect(() => {
    setCountdown(compute());
    const interval = setInterval(() => setCountdown(compute()), 30000);
    return () => clearInterval(interval);
  }, [compute]);

  return countdown;
}

const STATUS_COLORS: Record<SocialPostStatus, string> = {
  DRAFT: 'bg-gray-700 text-gray-200',
  PENDING_APPROVAL: 'bg-yellow-700 text-yellow-100',
  SCHEDULED: 'bg-blue-800 text-blue-200',
  PUBLISHED: 'bg-green-800 text-green-200',
  FAILED: 'bg-red-800 text-red-200',
};

function StatusBadge({ status }: { status: SocialPostStatus }) {
  const label = status === 'PENDING_APPROVAL' ? 'Pending Approval'
    : status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {label}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: SocialPlatform }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-secondary text-brand-gold border border-brand-gold/30">
      {PLATFORM_NAMES[platform]}
    </span>
  );
}

const SocialPostEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [activePreview, setActivePreview] = useState<SocialPlatform | null>(null);
  const [post, setPost] = useState<SocialPost | null>(null);

  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(['twitter']);
  const [imageUrl, setImageUrl] = useState('');
  const [articleId, setArticleId] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [scheduledFor, setScheduledFor] = useState('');
  const [existingStatus, setExistingStatus] = useState<SocialPostStatus | null>(null);

  const countdown = useCountdown(
    existingStatus === 'SCHEDULED' && post?.scheduledFor ? post.scheduledFor : null
  );

  useEffect(() => {
    getArticles({ status: 'PUBLISHED', limit: 200 })
      .then((res) => setArticles(res.articles))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    getSocialPost(id!)
      .then((p: SocialPost) => {
        setPost(p);
        setContent(p.content);
        setPlatforms(p.platforms as SocialPlatform[]);
        setImageUrl(p.imageUrl || '');
        setArticleId(p.articleId || '');
        setExistingStatus(p.status);
        if (p.scheduledFor) {
          setScheduleMode('schedule');
          setScheduledFor(formatDatetimeLocal(p.scheduledFor));
        }
        if (p.platforms.length > 0) {
          setActivePreview(p.platforms[0] as SocialPlatform);
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
  const isFailed = existingStatus === 'FAILED';
  const isPendingApproval = existingStatus === 'PENDING_APPROVAL';
  const isScheduled = existingStatus === 'SCHEDULED';
  const isPublished = existingStatus === 'PUBLISHED';

  const buildData = () => ({
    content,
    platforms,
    imageUrl: imageUrl || null,
    articleId: articleId || null,
    scheduledFor: scheduleMode === 'schedule' && scheduledFor ? new Date(scheduledFor).toISOString() : null,
  });

  const validate = () => {
    if (!content.trim()) { setError('Content is required'); return false; }
    if (platforms.length === 0) { setError('Select at least one platform'); return false; }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const created = await createSocialPost(buildData());
        navigate(`/admin/social/${created.id}`, { replace: true });
      } else {
        await updateSocialPost(id!, buildData());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!validate()) return;
    setPublishing(true);
    setError(null);
    try {
      let postId = id;
      if (isNew) {
        const created = await createSocialPost(buildData());
        postId = created.id;
      } else {
        await updateSocialPost(id!, buildData());
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

  const handleApprove = async () => {
    if (!id) return;
    setApproving(true);
    setError(null);
    try {
      await approveSocialPost(id);
      navigate('/admin/social');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setApproving(false);
    }
  };

  const handleRetry = async () => {
    if (!id) return;
    setRetrying(true);
    setError(null);
    try {
      await retrySocialPost(id);
      navigate('/admin/social');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setRetrying(false);
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
  const hashtags = extractHashtags(content);

  const primaryPlatform: SocialPlatform | null = platforms.length === 1
    ? platforms[0]
    : (post?.platforms?.length === 1 ? (post.platforms[0] as SocialPlatform) : null);

  const Spinner = () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={() => navigate('/admin/social')}
          className="p-1.5 rounded text-content-secondary hover:text-content hover:bg-base-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-content">{isNew ? 'New Post' : 'Edit Post'}</h1>
        {existingStatus && <StatusBadge status={existingStatus} />}
        {primaryPlatform && <PlatformBadge platform={primaryPlatform} />}
      </div>

      {/* FAILED: error reason banner */}
      {isFailed && post && (post as SocialPost & { errorReason?: string }).errorReason && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-300 flex gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-700">Publishing failed</p>
            <p className="text-sm text-red-600 mt-0.5">{(post as SocialPost & { errorReason?: string }).errorReason}</p>
          </div>
        </div>
      )}

      {/* Countdown for scheduled posts */}
      {isScheduled && countdown && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-blue-700">{countdown}</p>
        </div>
      )}

      {/* Published: link to live post */}
      {isPublished && post?.platformResults && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700">Published successfully</p>
            {Object.entries(post.platformResults).map(([platform, result]) => {
              const r = result as Record<string, string>;
              const url = r?.url || r?.permalink;
              if (!url) return null;
              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:underline flex items-center gap-1 mt-1"
                >
                  View on {PLATFORM_NAMES[platform as SocialPlatform] || platform}
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* General error */}
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

          {/* Hashtag pills */}
          {hashtags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 border border-brand-gold/40 text-brand-gold"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

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
              Content exceeds the limit for one or more platforms. It will be truncated in preview.
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

        {/* Schedule — hidden for PUBLISHED/FAILED */}
        {!isReadOnly && (
          <div className="bg-base-100 rounded-lg shadow-soft p-5">
            <label className="block text-sm font-semibold text-content mb-3">Timing</label>
            <div className="flex gap-3 mb-3">
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                scheduleMode === 'now' ? 'border-brand-gold bg-yellow-50' : 'border-base-300 hover:border-brand-gold'
              }`}>
                <input
                  type="radio"
                  name="scheduleMode"
                  value="now"
                  checked={scheduleMode === 'now'}
                  onChange={() => setScheduleMode('now')}
                  className="accent-brand-gold"
                />
                <span className="text-sm font-medium text-content">Post Now</span>
              </label>
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                scheduleMode === 'schedule' ? 'border-brand-gold bg-yellow-50' : 'border-base-300 hover:border-brand-gold'
              }`}>
                <input
                  type="radio"
                  name="scheduleMode"
                  value="schedule"
                  checked={scheduleMode === 'schedule'}
                  onChange={() => setScheduleMode('schedule')}
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
                className="text-sm border border-base-300 rounded px-3 py-2 text-content focus:outline-none focus:ring-2 focus:ring-brand-gold"
              />
            )}
          </div>
        )}

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
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div>
                    <span className="text-xs font-semibold text-content-secondary uppercase tracking-wide">
                      {PLATFORM_NAMES[activePreview]} Preview
                    </span>
                    <p className="text-xs text-content-secondary mt-0.5">{PLATFORM_HINTS[activePreview]}</p>
                  </div>
                  <span className={`text-xs flex-shrink-0 ${charCountColor(contentLen, PLATFORM_LIMITS[activePreview])}`}>
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
                    className={`mt-3 w-full rounded object-cover ${activePreview === 'instagram' ? 'aspect-square' : 'h-40'}`}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions — DRAFT */}
        {!existingStatus && (
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <button
              onClick={handleSaveDraft}
              disabled={saving || publishing}
              className="px-4 py-2 rounded border border-base-300 text-sm font-medium text-content hover:bg-base-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Spinner />}
              Save as Draft
            </button>
            <button
              onClick={handlePublish}
              disabled={saving || publishing || platforms.length === 0}
              className="px-4 py-2 rounded bg-brand-gold text-brand-primary text-sm font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {publishing && <Spinner />}
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

        {/* Actions — DRAFT status */}
        {existingStatus === 'DRAFT' && (
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <button
              onClick={handleSaveDraft}
              disabled={saving || publishing}
              className="px-4 py-2 rounded border border-base-300 text-sm font-medium text-content hover:bg-base-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Spinner />}
              Save Draft
            </button>
            <button
              onClick={handlePublish}
              disabled={saving || publishing || platforms.length === 0}
              className="px-4 py-2 rounded bg-brand-gold text-brand-primary text-sm font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {publishing && <Spinner />}
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

        {/* Actions — PENDING_APPROVAL */}
        {isPendingApproval && (
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <button
              onClick={handleApprove}
              disabled={approving || saving}
              className="px-4 py-2 rounded bg-brand-gold text-brand-primary text-sm font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {approving && <Spinner />}
              Approve & Schedule
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving || approving}
              className="px-4 py-2 rounded border border-base-300 text-sm font-medium text-content hover:bg-base-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Spinner />}
              Save Edits
            </button>
            <button
              onClick={() => navigate('/admin/social')}
              disabled={saving || approving}
              className="px-4 py-2 rounded text-sm text-content-secondary hover:text-content transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Actions — SCHEDULED */}
        {isScheduled && (
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-4 py-2 rounded border border-base-300 text-sm font-medium text-content hover:bg-base-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Spinner />}
              Save Changes
            </button>
            <button
              onClick={() => navigate('/admin/social')}
              disabled={saving}
              className="px-4 py-2 rounded text-sm text-content-secondary hover:text-content transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Actions — PUBLISHED */}
        {isPublished && (
          <div className="pt-1">
            <button
              onClick={() => navigate('/admin/social')}
              className="px-4 py-2 rounded border border-base-300 text-sm font-medium text-content hover:bg-base-200 transition-colors"
            >
              Back to Posts
            </button>
          </div>
        )}

        {/* Actions — FAILED */}
        {isFailed && (
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="px-4 py-2 rounded bg-brand-gold text-brand-primary text-sm font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {retrying && <Spinner />}
              Retry Publishing
            </button>
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
