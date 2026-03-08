import React from 'react';
import { useNavigate } from 'react-router-dom';
import { type SocialPost, type SocialPostStatus, type SocialPlatform } from '../../../services/adminSocialService';

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`fill-current ${className ?? 'w-4 h-4'}`}>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.884v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`fill-current ${className ?? 'w-4 h-4'}`}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`fill-current ${className ?? 'w-4 h-4'}`}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`fill-current ${className ?? 'w-4 h-4'}`}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const PLATFORM_CONFIG: Record<SocialPlatform, { label: string; iconClass: string; icon: React.ReactNode }> = {
  facebook: {
    label: 'Facebook',
    iconClass: 'text-blue-500',
    icon: <FacebookIcon />,
  },
  twitter: {
    label: 'X',
    iconClass: 'text-slate-300',
    icon: <XIcon />,
  },
  instagram: {
    label: 'Instagram',
    iconClass: 'text-pink-500',
    icon: <InstagramIcon />,
  },
  linkedin: {
    label: 'LinkedIn',
    iconClass: 'text-sky-500',
    icon: <LinkedInIcon />,
  },
};

const STATUS_CONFIG: Record<SocialPostStatus, { label: string; classes: string }> = {
  DRAFT: { label: 'Draft', classes: 'bg-gray-700 text-gray-200' },
  PENDING_APPROVAL: { label: 'Pending Approval', classes: 'bg-yellow-800 text-yellow-200' },
  SCHEDULED: { label: 'Scheduled', classes: 'bg-blue-800 text-blue-200' },
  PUBLISHED: { label: 'Published', classes: 'bg-green-800 text-green-200' },
  FAILED: { label: 'Failed', classes: 'bg-red-800 text-red-200' },
};

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const isFuture = diffMs > 0;

  const minutes = Math.floor(absDiffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let label: string;
  if (minutes < 1) {
    label = 'just now';
  } else if (minutes < 60) {
    label = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  } else if (hours < 24) {
    label = `${hours} hour${hours === 1 ? '' : 's'}`;
  } else {
    label = `${days} day${days === 1 ? '' : 's'}`;
  }

  if (minutes < 1) return label;
  return isFuture ? `in ${label}` : `${label} ago`;
}

function getPlatformResultUrl(post: SocialPost): string | null {
  if (!post.platformResults) return null;
  const results = post.platformResults as Record<string, { url?: string }>;
  const platforms = post.platforms as SocialPlatform[];
  for (const p of platforms) {
    if (results[p]?.url) return results[p].url!;
  }
  const firstKey = Object.keys(results)[0];
  if (firstKey && (results[firstKey] as { url?: string })?.url) {
    return (results[firstKey] as { url: string }).url;
  }
  return null;
}

interface SocialPostCardProps {
  post: SocialPost;
  onRetry: (id: string) => void;
  onApprove: (id: string) => void;
  onCancel: (post: SocialPost) => void;
  retrying?: boolean;
  approving?: boolean;
}

const SocialPostCard: React.FC<SocialPostCardProps> = ({
  post,
  onRetry,
  onApprove,
  onCancel,
  retrying,
  approving,
}) => {
  const navigate = useNavigate();
  const platforms = post.platforms as SocialPlatform[];
  const primaryPlatform = platforms[0];
  const platformCfg = primaryPlatform ? PLATFORM_CONFIG[primaryPlatform] : null;
  const statusCfg = STATUS_CONFIG[post.status];
  const platformUrl = getPlatformResultUrl(post);

  const timestamp =
    post.status === 'PUBLISHED'
      ? relativeTime(post.publishedAt)
      : post.status === 'SCHEDULED'
      ? relativeTime(post.scheduledFor)
      : relativeTime(post.createdAt);

  return (
    <div className="bg-base-100 rounded-lg shadow-soft border border-base-300 p-4 hover:border-brand-gold transition-colors">
      <div className="flex items-start gap-3">
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt=""
            className="w-16 h-12 rounded object-cover flex-shrink-0 bg-base-200"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {platformCfg && (
              <span className={`flex items-center gap-1 text-sm font-medium ${platformCfg.iconClass}`}>
                {platformCfg.icon}
                {platformCfg.label}
              </span>
            )}
            {platforms.length > 1 && (
              <span className="text-xs text-content-secondary">+{platforms.length - 1} more</span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.classes}`}>
              {statusCfg.label}
            </span>
            <span className="text-xs text-content-secondary ml-auto">{timestamp}</span>
          </div>

          <p className="text-sm text-content line-clamp-2 mb-1.5">
            {post.content.length > 120 ? post.content.slice(0, 120) + '…' : post.content}
          </p>

          {post.article && (
            <p className="text-xs text-content-secondary truncate">
              Article:{' '}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/articles/${post.articleId}`);
                }}
                className="text-brand-gold hover:underline"
              >
                {post.article.title}
              </button>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-base-300">
        {post.status === 'FAILED' && (
          <>
            <button
              onClick={() => onRetry(post.id)}
              disabled={retrying}
              className="px-3 py-1.5 text-xs rounded bg-brand-gold text-brand-primary font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              {retrying ? 'Retrying…' : 'Retry'}
            </button>
            <button
              onClick={() => navigate(`/admin/social/${post.id}/edit`)}
              className="px-3 py-1.5 text-xs rounded border border-base-300 text-content hover:bg-base-200 transition-colors"
            >
              Edit & Retry
            </button>
          </>
        )}

        {post.status === 'SCHEDULED' && (
          <>
            <button
              onClick={() => navigate(`/admin/social/${post.id}/edit`)}
              className="px-3 py-1.5 text-xs rounded border border-base-300 text-content hover:bg-base-200 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onCancel(post)}
              className="px-3 py-1.5 text-xs rounded border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
            >
              Cancel
            </button>
          </>
        )}

        {post.status === 'PENDING_APPROVAL' && (
          <>
            <button
              onClick={() => onApprove(post.id)}
              disabled={approving}
              className="px-3 py-1.5 text-xs rounded bg-brand-gold text-brand-primary font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              {approving ? 'Approving…' : 'Approve'}
            </button>
            <button
              onClick={() => navigate(`/admin/social/${post.id}/edit`)}
              className="px-3 py-1.5 text-xs rounded border border-base-300 text-content hover:bg-base-200 transition-colors"
            >
              Edit
            </button>
          </>
        )}

        {post.status === 'PUBLISHED' && platformUrl && (
          <a
            href={platformUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-base-300 text-content hover:bg-base-200 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            View on {platformCfg?.label ?? 'Platform'}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}

        <button
          onClick={() => navigate(`/admin/social/${post.id}/edit`)}
          className="ml-auto text-xs text-content-secondary hover:text-content transition-colors"
        >
          View details
        </button>
      </div>
    </div>
  );
};

export default SocialPostCard;
