import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getApiUrl, getImageUrl } from '../../../services/apiConfig';
import authService from '../../../services/authService';
import CopyToClipboard from '../../shared/CopyToClipboard';
import type { DailyWizardRun } from '../../../hooks/useDailyWizard';
import type { SocialPost, SocialPlatform } from '../../../services/adminSocialService';

interface Step5Props {
  run: DailyWizardRun;
  onNext: () => void;
  onUpdateRun: (data: Partial<DailyWizardRun>) => Promise<void>;
}

type PostStatus = 'queued' | 'publishing' | 'published' | 'scheduled' | 'failed';

interface TimelinePost extends SocialPost {
  localStatus: PostStatus;
  localScheduledTime: string;
}

const PLATFORM_ICONS: Record<string, { label: string; color: string }> = {
  twitter: { label: 'X', color: 'bg-black text-white' },
  facebook: { label: 'FB', color: 'bg-blue-600 text-white' },
  linkedin: { label: 'in', color: 'bg-blue-700 text-white' },
  instagram: { label: 'IG', color: 'bg-gradient-to-br from-purple-600 to-pink-500 text-white' },
};

const STATUS_BADGES: Record<PostStatus, { label: string; classes: string }> = {
  queued: { label: 'Queued', classes: 'bg-base-200 text-content-secondary' },
  scheduled: { label: 'Scheduled', classes: 'bg-blue-100 text-blue-700' },
  publishing: { label: 'Publishing...', classes: 'bg-brand-gold/20 text-brand-gold animate-pulse' },
  published: { label: 'Published', classes: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', classes: 'bg-red-100 text-red-700' },
};

function formatTimeForInput(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function suggestPostingTimes(count: number): string[] {
  const startHour = 9;
  const endHour = 18;
  const totalMinutes = (endHour - startHour) * 60;
  const gap = Math.floor(totalMinutes / Math.max(count, 1));
  const times: string[] = [];
  for (let i = 0; i < count; i++) {
    const offset = startHour * 60 + i * gap;
    const h = Math.floor(offset / 60);
    const m = offset % 60;
    times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return times;
}

function mapPostStatus(post: SocialPost): PostStatus {
  switch (post.status) {
    case 'PUBLISHED': return 'published';
    case 'SCHEDULED': return 'scheduled';
    case 'FAILED': return 'failed';
    default: return 'queued';
  }
}

const Step5_Publish: React.FC<Step5Props> = ({ run, onNext, onUpdateRun }) => {
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishingAll, setPublishingAll] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const today = new Date().toISOString().split('T')[0];
      const qs = new URLSearchParams({
        dateFrom: today,
        dateTo: new Date(new Date(today).getTime() + 86400000).toISOString().split('T')[0],
        limit: '100',
      });
      const res = await authService.makeAuthenticatedRequest(
        getApiUrl(`/api/admin/social-posts?${qs}`)
      );
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      const eligible = (data.posts as SocialPost[]).filter(
        (p) => ['DRAFT', 'SCHEDULED', 'PENDING_APPROVAL', 'PUBLISHED'].includes(p.status)
      );
      const suggestedTimes = suggestPostingTimes(eligible.length);
      const mapped: TimelinePost[] = eligible.map((p, i) => ({
        ...p,
        localStatus: mapPostStatus(p),
        localScheduledTime: p.scheduledFor
          ? formatTimeForInput(new Date(p.scheduledFor))
          : suggestedTimes[i] || '09:00',
      }));
      mapped.sort((a, b) => a.localScheduledTime.localeCompare(b.localScheduledTime));
      setPosts(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const updatePostTime = useCallback((postId: string, time: string) => {
    setPosts((prev) =>
      prev
        .map((p) => (p.id === postId ? { ...p, localScheduledTime: time } : p))
        .sort((a, b) => a.localScheduledTime.localeCompare(b.localScheduledTime))
    );
  }, []);

  const schedulePost = useCallback(async (post: TimelinePost) => {
    const today = new Date().toISOString().split('T')[0];
    const scheduledFor = new Date(`${today}T${post.localScheduledTime}:00`).toISOString();
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, localStatus: 'scheduled' } : p))
    );
    try {
      const res = await authService.makeAuthenticatedRequest(
        getApiUrl(`/api/admin/social-posts/${post.id}`),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledFor, status: 'SCHEDULED' }),
        }
      );
      if (!res.ok) throw new Error('Failed to schedule');
    } catch {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, localStatus: 'queued' } : p))
      );
    }
  }, []);

  const publishPost = useCallback(async (post: TimelinePost) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, localStatus: 'publishing' } : p))
    );
    try {
      const res = await authService.makeAuthenticatedRequest(
        getApiUrl(`/api/admin/social-posts/${post.id}/publish`),
        { method: 'POST' }
      );
      if (!res.ok) throw new Error('Failed to publish');
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, localStatus: 'published' } : p))
      );
    } catch {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, localStatus: 'failed' } : p))
      );
    }
  }, []);

  const publishAll = useCallback(async () => {
    setPublishingAll(true);
    const pending = posts.filter(
      (p) => p.localStatus === 'queued' || p.localStatus === 'scheduled'
    );
    for (const post of pending) {
      await schedulePost(post);
      await publishPost(post);
    }
    setPublishingAll(false);
  }, [posts, schedulePost, publishPost]);

  const autoSuggestTimes = useCallback(() => {
    const unscheduled = posts.filter((p) => p.localStatus !== 'published');
    const times = suggestPostingTimes(unscheduled.length);
    setPosts((prev) => {
      let idx = 0;
      return prev
        .map((p) => {
          if (p.localStatus === 'published') return p;
          return { ...p, localScheduledTime: times[idx++] || p.localScheduledTime };
        })
        .sort((a, b) => a.localScheduledTime.localeCompare(b.localScheduledTime));
    });
  }, [posts]);

  const allPublished = useMemo(
    () => posts.length > 0 && posts.every((p) => p.localStatus === 'published'),
    [posts]
  );

  const handleContinue = useCallback(async () => {
    if (allPublished) {
      await onUpdateRun({ allPublished: true });
    }
    onNext();
  }, [allPublished, onUpdateRun, onNext]);

  const downloadImage = useCallback(async (url: string, filename: string) => {
    try {
      const res = await fetch(getImageUrl(url) || url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(getImageUrl(url) || url, '_blank');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-content">Schedule & Publish</h2>
          <p className="text-sm text-content-secondary mt-1">
            Review timing and publish your content
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={autoSuggestTimes}
            className="px-3 py-1.5 text-sm font-medium bg-base-200 text-content rounded hover:bg-base-300 transition-colors"
          >
            Auto-space times
          </button>
          <button
            type="button"
            onClick={publishAll}
            disabled={publishingAll || allPublished || posts.length === 0}
            className="px-4 py-1.5 text-sm font-medium bg-brand-gold text-brand-primary rounded hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishingAll ? 'Publishing...' : 'Publish All'}
          </button>
        </div>
      </div>

      {/* Newsletter status banner */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-base-200">
        <div className="flex-shrink-0">
          {run.newsletterSent ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-content-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )}
        </div>
        <span className="text-sm font-medium text-content">
          {run.newsletterSent ? 'Newsletter sent' : 'Newsletter skipped'}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-12 bg-base-200 rounded-lg">
          <p className="text-content-secondary">No social posts to publish today.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[39px] top-0 bottom-0 w-px bg-base-300" />

          <div className="space-y-4">
            {posts.map((post) => (
              <TimelineEntry
                key={post.id}
                post={post}
                onTimeChange={updatePostTime}
                onSchedule={schedulePost}
                onPublish={publishPost}
                onDownloadImage={downloadImage}
              />
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {posts.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-content-secondary pt-2">
          <span>{posts.filter((p) => p.localStatus === 'published').length} published</span>
          <span>{posts.filter((p) => p.localStatus === 'scheduled').length} scheduled</span>
          <span>{posts.filter((p) => p.localStatus === 'queued').length} queued</span>
          {posts.some((p) => p.localStatus === 'failed') && (
            <span className="text-red-600">
              {posts.filter((p) => p.localStatus === 'failed').length} failed
            </span>
          )}
        </div>
      )}

      {/* Continue */}
      <div className="flex justify-end pt-4 border-t border-base-300">
        <button
          type="button"
          onClick={handleContinue}
          className="px-5 py-2 text-sm font-medium bg-brand-gold text-brand-primary rounded hover:bg-brand-gold/90 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

interface TimelineEntryProps {
  post: TimelinePost;
  onTimeChange: (id: string, time: string) => void;
  onSchedule: (post: TimelinePost) => void;
  onPublish: (post: TimelinePost) => void;
  onDownloadImage: (url: string, filename: string) => void;
}

const TimelineEntry: React.FC<TimelineEntryProps> = ({
  post,
  onTimeChange,
  onSchedule,
  onPublish,
  onDownloadImage,
}) => {
  const platformInfo = post.platform
    ? PLATFORM_ICONS[post.platform]
    : post.platforms?.[0]
      ? PLATFORM_ICONS[post.platforms[0]]
      : null;

  const statusBadge = STATUS_BADGES[post.localStatus];
  const isActionable = post.localStatus === 'queued' || post.localStatus === 'scheduled';
  const platformLabel = post.platform || post.platforms?.[0] || 'unknown';
  const imageUrl = getImageUrl(post.imageUrl || undefined);

  return (
    <div className="relative flex gap-4 pl-2">
      {/* Time + dot */}
      <div className="flex flex-col items-center w-[60px] flex-shrink-0 z-10">
        <input
          type="time"
          value={post.localScheduledTime}
          onChange={(e) => onTimeChange(post.id, e.target.value)}
          disabled={!isActionable}
          className="w-full text-xs font-mono text-content bg-transparent border-none p-0 text-center focus:outline-none disabled:text-content-secondary"
        />
        <div
          className={`w-3 h-3 rounded-full mt-1 border-2 ${
            post.localStatus === 'published'
              ? 'bg-green-500 border-green-500'
              : post.localStatus === 'publishing'
                ? 'bg-brand-gold border-brand-gold'
                : post.localStatus === 'failed'
                  ? 'bg-red-500 border-red-500'
                  : 'bg-base-100 border-base-400'
          }`}
        />
      </div>

      {/* Card */}
      <div className="flex-1 bg-base-100 border border-base-300 rounded-lg p-4 hover:border-brand-gold/30 transition-colors">
        <div className="flex items-start gap-3">
          {/* Platform icon */}
          {platformInfo && (
            <div
              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${platformInfo.color}`}
            >
              {platformInfo.label}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-content capitalize">{platformLabel}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.classes}`}>
                {statusBadge.label}
              </span>
            </div>
            <p className="text-sm text-content-secondary line-clamp-2">{post.content}</p>
          </div>

          {/* Thumbnail */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="w-16 h-16 rounded object-cover flex-shrink-0"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-base-200">
          {isActionable && (
            <>
              <button
                type="button"
                onClick={() => onPublish(post)}
                className="px-3 py-1 text-xs font-medium bg-brand-gold text-brand-primary rounded hover:bg-brand-gold/90 transition-colors"
              >
                Publish Now
              </button>
              <button
                type="button"
                onClick={() => onSchedule(post)}
                className="px-3 py-1 text-xs font-medium bg-base-200 text-content rounded hover:bg-base-300 transition-colors"
              >
                Schedule
              </button>
            </>
          )}

          {/* Copy to clipboard fallback */}
          <CopyToClipboard
            content={post.content}
            label="Copy Text"
            format="text"
            className="!px-3 !py-1 !text-xs"
          />

          {post.imageUrl && (
            <button
              type="button"
              onClick={() =>
                onDownloadImage(
                  post.imageUrl!,
                  `propertyhack-${platformLabel}-${post.id}.jpg`
                )
              }
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-base-200 text-content rounded hover:bg-base-300 transition-colors border border-base-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Image
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step5_Publish;
