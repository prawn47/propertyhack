import React, { useState, useEffect, useCallback } from 'react';
import {
  getSocialPosts,
  approveSocialPost,
  updateSocialPost,
  deleteSocialPost,
  type SocialPost,
  type SocialPlatform,
} from '../../../services/adminSocialService';
import { getImageUrl } from '../../../services/apiConfig';
import ImageEditor from './ImageEditor';
import Loader from '../../Loader';

type PlatformFilter = 'all' | SocialPlatform;

const PLATFORM_TABS: { key: PlatformFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'twitter', label: 'X / Twitter' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
];

const PLATFORM_ICONS: Record<SocialPlatform, string> = {
  twitter: 'X',
  facebook: 'FB',
  linkedin: 'LI',
  instagram: 'IG',
};

const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  twitter: 'bg-slate-700 text-slate-200',
  facebook: 'bg-blue-900 text-blue-200',
  linkedin: 'bg-sky-900 text-sky-200',
  instagram: 'bg-pink-900 text-pink-200',
};

interface Step3Props {
  onNext: () => void;
  onSkip: () => void;
  updateRun: (data: Record<string, unknown>) => Promise<void>;
}

export default function Step3_SocialReview({ onNext, onSkip, updateRun }: Step3Props) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [imageEditorId, setImageEditorId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateFrom = todayStart.toISOString();
      const dateTo = todayEnd.toISOString();

      const [drafts, pending] = await Promise.all([
        getSocialPosts({ status: 'DRAFT', dateFrom, dateTo, limit: 100 }),
        getSocialPosts({ status: 'PENDING_APPROVAL', dateFrom, dateTo, limit: 100 }),
      ]);

      const all = [...drafts.posts, ...pending.posts];
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPosts(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load social posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const filteredPosts = platformFilter === 'all'
    ? posts
    : posts.filter((p) => p.platforms.includes(platformFilter));

  const approvedCount = posts.filter((p) => p.status === 'SCHEDULED' || p.status === 'PUBLISHED').length;
  const rejectedCount = posts.filter((p) => p.status === 'FAILED').length;
  const draftCount = posts.filter((p) => p.status === 'DRAFT' || p.status === 'PENDING_APPROVAL').length;

  const setActionBusy = (id: string, busy: boolean) => {
    setActionLoading((prev) => {
      const next = new Set(prev);
      busy ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const handleApprove = async (post: SocialPost) => {
    setActionBusy(post.id, true);
    try {
      if (post.status === 'PENDING_APPROVAL') {
        await approveSocialPost(post.id);
      } else {
        await updateSocialPost(post.id, { scheduledFor: new Date(Date.now() + 5 * 60 * 1000).toISOString() });
      }
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: 'SCHEDULED' } : p))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve post');
    } finally {
      setActionBusy(post.id, false);
    }
  };

  const handleReject = async (post: SocialPost) => {
    setActionBusy(post.id, true);
    try {
      await deleteSocialPost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject post');
    } finally {
      setActionBusy(post.id, false);
    }
  };

  const handleEditSave = async (post: SocialPost) => {
    if (!editText.trim()) return;
    setActionBusy(post.id, true);
    try {
      const updated = await updateSocialPost(post.id, { content: editText.trim() });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, content: updated.content } : p)));
      setEditingId(null);
      setEditText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update post');
    } finally {
      setActionBusy(post.id, false);
    }
  };

  const handleImageChange = async (postId: string, newImageUrl: string) => {
    setActionBusy(postId, true);
    try {
      await updateSocialPost(postId, { imageUrl: newImageUrl });
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, imageUrl: newImageUrl } : p)));
      setImageEditorId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update image');
    } finally {
      setActionBusy(postId, false);
    }
  };

  const handleBulkApprove = async (ids: string[]) => {
    const toApprove = posts.filter(
      (p) => ids.includes(p.id) && (p.status === 'DRAFT' || p.status === 'PENDING_APPROVAL')
    );
    for (const post of toApprove) {
      await handleApprove(post);
    }
    setSelectedIds(new Set());
  };

  const handleContinue = async () => {
    const totalApproved = posts.filter((p) => p.status === 'SCHEDULED' || p.status === 'PUBLISHED').length;
    await updateRun({ socialPostsApproved: totalApproved });
    onNext();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const actionable = filteredPosts.filter((p) => p.status === 'DRAFT' || p.status === 'PENDING_APPROVAL');
    if (selectedIds.size === actionable.length && actionable.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(actionable.map((p) => p.id)));
    }
  };

  const extractHashtags = (content: string): string[] => {
    const matches = content.match(/#\w+/g);
    return matches || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader className="h-8 w-8 text-brand-gold" />
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={fetchPosts}
          className="mt-3 px-4 py-2 text-sm bg-brand-primary text-white rounded hover:bg-brand-secondary transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-12 h-12 mx-auto text-content-secondary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
        <p className="text-content font-medium">No social posts for today</p>
        <p className="text-content-secondary text-sm mt-1">Social posts will appear here once generated.</p>
        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={onSkip}
            className="px-4 py-2 text-sm font-medium text-content-secondary hover:text-content transition-colors"
          >
            Skip
          </button>
          <button
            onClick={onNext}
            className="px-4 py-2 rounded text-sm font-medium bg-brand-gold text-brand-primary hover:bg-brand-gold/90 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-content-secondary">
          <span className="font-medium text-content">{posts.length} posts</span>
          {approvedCount > 0 && <>, <span className="text-green-600">{approvedCount} approved</span></>}
          {rejectedCount > 0 && <>, <span className="text-red-600">{rejectedCount} rejected</span></>}
          {draftCount > 0 && <>, <span className="text-yellow-600">{draftCount} pending</span></>}
        </p>
      </div>

      {/* Platform filter tabs */}
      <div className="flex gap-1 border-b border-base-300">
        {PLATFORM_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPlatformFilter(tab.key)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              platformFilter === tab.key
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-content-secondary hover:text-content hover:border-base-300',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bulk actions toolbar */}
      {draftCount > 0 && (
        <div className="flex items-center gap-3 bg-base-200 rounded-lg px-4 py-2">
          <label className="flex items-center gap-2 text-sm text-content-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={
                selectedIds.size > 0 &&
                selectedIds.size === filteredPosts.filter((p) => p.status === 'DRAFT' || p.status === 'PENDING_APPROVAL').length
              }
              onChange={toggleSelectAll}
              className="rounded border-base-300 text-brand-gold focus:ring-brand-gold"
            />
            Select all
          </label>
          <div className="flex-1" />
          <button
            onClick={() => handleBulkApprove(Array.from(selectedIds))}
            disabled={selectedIds.size === 0}
            className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Approve Selected ({selectedIds.size})
          </button>
          <button
            onClick={() => {
              const actionable = filteredPosts
                .filter((p) => p.status === 'DRAFT' || p.status === 'PENDING_APPROVAL')
                .map((p) => p.id);
              handleBulkApprove(actionable);
            }}
            disabled={draftCount === 0}
            className="px-3 py-1.5 text-sm font-medium bg-brand-gold text-brand-primary rounded hover:bg-brand-gold/90 transition-colors disabled:opacity-40"
          >
            Approve All
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Post grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPosts.map((post) => {
          const hashtags = extractHashtags(post.content);
          const isBusy = actionLoading.has(post.id);
          const isEditing = editingId === post.id;
          const isEditingImage = imageEditorId === post.id;
          const isActionable = post.status === 'DRAFT' || post.status === 'PENDING_APPROVAL';

          return (
            <div
              key={post.id}
              className={[
                'border rounded-lg overflow-hidden transition-colors',
                post.status === 'SCHEDULED' ? 'border-green-300 bg-green-50/50' : 'border-base-300 bg-base-100',
              ].join(' ')}
            >
              {/* Card header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-base-300">
                {isActionable && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(post.id)}
                    onChange={() => toggleSelect(post.id)}
                    className="rounded border-base-300 text-brand-gold focus:ring-brand-gold"
                  />
                )}
                <div className="flex gap-1">
                  {post.platforms.map((p) => (
                    <span
                      key={p}
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${PLATFORM_COLORS[p]}`}
                    >
                      {PLATFORM_ICONS[p]}
                    </span>
                  ))}
                </div>
                <div className="flex-1" />
                {post.status === 'SCHEDULED' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-800 text-green-200">
                    Approved
                  </span>
                )}
                {(post.status === 'DRAFT' || post.status === 'PENDING_APPROVAL') && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-800 text-yellow-200">
                    Pending
                  </span>
                )}
              </div>

              {/* Image thumbnail */}
              {isEditingImage ? (
                <div className="p-3">
                  <ImageEditor
                    imageUrl={post.imageUrl}
                    onImageChange={(url) => handleImageChange(post.id, url)}
                    aspectRatio="16:9"
                    context={{ title: post.article?.title, type: 'social' }}
                  />
                  <button
                    onClick={() => setImageEditorId(null)}
                    className="mt-2 text-sm text-content-secondary hover:text-content transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : post.imageUrl ? (
                <div className="relative aspect-video bg-base-200">
                  <img
                    src={getImageUrl(post.imageUrl)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}

              {/* Content */}
              <div className="px-3 py-2">
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-base-300 rounded-lg bg-white text-content focus:outline-none focus:ring-2 focus:ring-brand-accent/50 resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSave(post)}
                        disabled={isBusy || !editText.trim()}
                        className="px-3 py-1.5 text-sm bg-brand-accent text-brand-primary font-medium rounded hover:bg-brand-accent/90 transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditText(''); }}
                        className="px-3 py-1.5 text-sm text-content-secondary hover:text-content transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-content line-clamp-3">{post.content}</p>
                )}

                {/* Hashtags */}
                {!isEditing && hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {hashtags.slice(0, 5).map((tag, i) => (
                      <span key={i} className="text-xs text-brand-gold font-medium">{tag}</span>
                    ))}
                    {hashtags.length > 5 && (
                      <span className="text-xs text-content-secondary">+{hashtags.length - 5} more</span>
                    )}
                  </div>
                )}

                {/* Article reference */}
                {post.article && !isEditing && (
                  <p className="text-xs text-content-secondary mt-1 truncate">
                    Re: {post.article.title}
                  </p>
                )}
              </div>

              {/* Card actions */}
              {isActionable && !isEditing && (
                <div className="flex items-center gap-1 px-3 py-2 border-t border-base-300 bg-base-200/50">
                  <button
                    onClick={() => handleApprove(post)}
                    disabled={isBusy}
                    className="px-2.5 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                    title="Approve"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { setEditingId(post.id); setEditText(post.content); }}
                    disabled={isBusy}
                    className="px-2.5 py-1 text-xs font-medium bg-brand-secondary text-white rounded hover:bg-brand-secondary/80 transition-colors disabled:opacity-50"
                    title="Edit text"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setImageEditorId(post.id)}
                    disabled={isBusy}
                    className="px-2.5 py-1 text-xs font-medium bg-brand-secondary text-white rounded hover:bg-brand-secondary/80 transition-colors disabled:opacity-50"
                    title="Edit image"
                  >
                    Image
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => handleReject(post)}
                    disabled={isBusy}
                    className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Reject (delete)"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Continue / Skip */}
      <div className="flex items-center justify-between pt-4 border-t border-base-300">
        <button
          onClick={onSkip}
          className="px-4 py-2 text-sm font-medium text-content-secondary hover:text-content transition-colors"
        >
          Skip
        </button>
        <button
          onClick={handleContinue}
          className="px-4 py-2 rounded text-sm font-medium bg-brand-gold text-brand-primary hover:bg-brand-gold/90 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
