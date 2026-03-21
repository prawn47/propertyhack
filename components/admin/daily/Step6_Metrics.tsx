import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../../../services/apiConfig';
import authService from '../../../services/authService';
import StreakCounter from './StreakCounter';
import CalendarView from './CalendarView';

interface TopArticle {
  id?: string;
  title: string;
  slug?: string;
  viewCount?: number;
  url?: string;
  clicks?: number;
}

interface NewsletterMetrics {
  available: boolean;
  openRate?: number | null;
  clickRate?: number | null;
  subscriberCount?: number;
  topArticles?: TopArticle[];
  subject?: string;
  sentAt?: string;
}

interface PlatformStats {
  posts: number;
  reach: number;
  engagement: number;
}

interface SocialMetrics {
  totalPosts: number;
  platforms: Record<string, PlatformStats>;
  trends: {
    posts: string;
    engagement: string;
  };
}

interface WebsiteMetrics {
  visits: number;
  topArticles: TopArticle[];
  newSignups: number;
  trends: {
    visits: string;
    signups: string;
  };
}

interface MetricsData {
  newsletter: NewsletterMetrics;
  social: SocialMetrics;
  website: WebsiteMetrics;
}

interface StreakData {
  streak: number;
  calendar: {
    month: number;
    year: number;
    completedDates: string[];
  };
}

interface Step6Props {
  onComplete: () => Promise<void>;
}

function TrendArrow({ trend }: { trend: string }) {
  if (trend === 'up') {
    return (
      <span className="inline-flex items-center text-green-600 text-sm font-medium">
        <svg className="w-4 h-4 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        Up
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="inline-flex items-center text-red-600 text-sm font-medium">
        <svg className="w-4 h-4 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Down
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-gray-400 text-sm font-medium">
      <svg className="w-4 h-4 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
      Flat
    </span>
  );
}

function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined) return '--';
  return `${(val * 100).toFixed(1)}%`;
}

function MetricRow({ label, value, trend }: { label: string; value: string | number; trend?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-content-secondary text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-content font-semibold">{value}</span>
        {trend && <TrendArrow trend={trend} />}
      </div>
    </div>
  );
}

const Step6_Metrics: React.FC<Step6Props> = ({ onComplete }) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [streakLoading, setStreakLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      setMetricsError(null);
      const res = await authService.makeAuthenticatedRequest(
        getApiUrl('/api/admin/daily/metrics')
      );
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const data: MetricsData = await res.json();
      setMetrics(data);
    } catch (err) {
      setMetricsError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const fetchStreak = useCallback(async () => {
    try {
      setStreakLoading(true);
      const res = await authService.makeAuthenticatedRequest(
        getApiUrl('/api/admin/daily/streak')
      );
      if (!res.ok) throw new Error('Failed to fetch streak');
      const data: StreakData = await res.json();
      setStreak(data);
    } catch {
      // Streak is non-critical; fail silently
    } finally {
      setStreakLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchStreak();
  }, [fetchMetrics, fetchStreak]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onComplete();
      setCompleted(true);
      // Refresh streak after completion
      fetchStreak();
    } catch {
      // Error handled by parent
    } finally {
      setCompleting(false);
    }
  };

  if (completed && streak) {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 rounded-full bg-brand-gold/20 flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10 text-brand-gold"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-content mb-2">Run Complete!</h2>
        <p className="text-content-secondary mb-6">Great work. See you tomorrow.</p>
        <StreakCounter streak={streak.streak} size="lg" />
        <div className="mt-6 flex justify-center">
          <CalendarView
            completedDates={streak.calendar.completedDates}
            month={streak.calendar.month - 1}
            year={streak.calendar.year}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-content mb-1">Metrics & Completion</h2>
        <p className="text-content-secondary text-sm">Yesterday's performance at a glance.</p>
      </div>

      {metricsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {metricsError}
        </div>
      )}

      {metricsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-base-200 rounded-lg p-5 animate-pulse h-48" />
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Newsletter Card */}
          <div className="bg-base-100 border border-base-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-content uppercase tracking-wide mb-3">Newsletter</h3>
            {!metrics.newsletter.available ? (
              <p className="text-content-secondary text-sm py-4">No newsletter sent recently.</p>
            ) : (
              <div className="divide-y divide-base-200">
                <MetricRow label="Open rate" value={formatPercent(metrics.newsletter.openRate)} />
                <MetricRow label="Click rate" value={formatPercent(metrics.newsletter.clickRate)} />
                <MetricRow label="Subscribers" value={metrics.newsletter.subscriberCount?.toLocaleString() ?? '--'} />
                {metrics.newsletter.topArticles && metrics.newsletter.topArticles.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-content-secondary mb-1">Top clicked</p>
                    <ul className="space-y-1">
                      {metrics.newsletter.topArticles.slice(0, 3).map((a, i) => (
                        <li key={i} className="text-xs text-content truncate">{a.title || a.url}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Social Card */}
          <div className="bg-base-100 border border-base-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-content uppercase tracking-wide mb-3">Social</h3>
            {metrics.social.totalPosts === 0 ? (
              <p className="text-content-secondary text-sm py-4">No social posts published yesterday.</p>
            ) : (
              <div className="divide-y divide-base-200">
                <MetricRow
                  label="Posts published"
                  value={metrics.social.totalPosts}
                  trend={metrics.social.trends.posts}
                />
                {Object.entries(metrics.social.platforms).map(([platform, stats]) => (
                  <div key={platform} className="py-2">
                    <p className="text-xs font-medium text-content capitalize mb-1">{platform}</p>
                    <div className="flex gap-4 text-xs text-content-secondary">
                      <span>Reach: {stats.reach.toLocaleString()}</span>
                      <span>Engagement: {stats.engagement.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                <MetricRow
                  label="Total engagement"
                  value={Object.values(metrics.social.platforms).reduce((s, p) => s + p.engagement, 0).toLocaleString()}
                  trend={metrics.social.trends.engagement}
                />
              </div>
            )}
          </div>

          {/* Website Card */}
          <div className="bg-base-100 border border-base-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-content uppercase tracking-wide mb-3">Website</h3>
            <div className="divide-y divide-base-200">
              <MetricRow
                label="Article views"
                value={metrics.website.visits.toLocaleString()}
                trend={metrics.website.trends.visits}
              />
              <MetricRow
                label="New signups"
                value={metrics.website.newSignups.toLocaleString()}
                trend={metrics.website.trends.signups}
              />
              {metrics.website.topArticles.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-content-secondary mb-1">Top articles</p>
                  <ul className="space-y-1">
                    {metrics.website.topArticles.map((a) => (
                      <li key={a.id} className="text-xs text-content truncate">
                        {a.title} ({a.viewCount ?? 0} views)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Streak & Calendar */}
      <div className="bg-base-100 border border-base-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-shrink-0">
            {streakLoading ? (
              <div className="w-24 h-24 bg-base-200 rounded-full animate-pulse" />
            ) : streak ? (
              <StreakCounter streak={streak.streak} size="lg" />
            ) : (
              <StreakCounter streak={0} size="lg" />
            )}
          </div>
          <div>
            {streakLoading ? (
              <div className="w-48 h-32 bg-base-200 rounded animate-pulse" />
            ) : streak ? (
              <CalendarView
                completedDates={streak.calendar.completedDates}
                month={streak.calendar.month - 1}
                year={streak.calendar.year}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Complete Button */}
      <div className="text-center pt-2">
        <button
          onClick={handleComplete}
          disabled={completing}
          className="px-8 py-3 rounded-lg text-base font-semibold bg-brand-gold text-brand-primary hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {completing ? 'Completing...' : "Complete Today's Run"}
        </button>
      </div>
    </div>
  );
};

export default Step6_Metrics;
