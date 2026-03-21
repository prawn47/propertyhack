import { useState, useEffect, useCallback } from 'react';
import { getApiUrl, getImageUrl } from '../../../services/apiConfig';
import authService from '../../../services/authService';
import ImageEditor from './ImageEditor';
import type { DailyWizardRun } from '../../../hooks/useDailyWizard';

interface Article {
  id: string;
  title: string;
  shortBlurb: string | null;
  longSummary: string | null;
  imageUrl: string | null;
  relevanceScore: number | null;
  market: string | null;
  slug: string;
}

interface Suggestion {
  angle: string;
  text: string;
}

interface Step4Props {
  run: DailyWizardRun;
  updateRun: (data: Partial<DailyWizardRun>) => Promise<void>;
  nextStep: () => void;
  skipStep: () => void;
}

const PLATFORMS = [
  { id: 'twitter', label: 'Twitter/X', maxChars: 280 },
  { id: 'instagram', label: 'Instagram', maxChars: 2200 },
  { id: 'facebook', label: 'Facebook', maxChars: 63206 },
] as const;

type PlatformId = (typeof PLATFORMS)[number]['id'];

export default function Step4_HotTake({ run, updateRun, nextStep, skipStep }: Step4Props) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(true);

  const [text, setText] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>(['twitter']);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticles() {
      try {
        setLoadingArticles(true);
        const res = await authService.makeAuthenticatedRequest(
          getApiUrl('/api/admin/articles?market=AU&status=PUBLISHED&sort=-relevanceScore&limit=5')
        );
        if (!res.ok) throw new Error('Failed to fetch articles');
        const data = await res.json();
        const list = data.articles || data;
        setArticles(Array.isArray(list) ? list : []);
        if (Array.isArray(list) && list.length > 0) {
          setSelectedArticle(list[0]);
        }
      } catch {
        setArticles([]);
      } finally {
        setLoadingArticles(false);
      }
    }
    fetchArticles();
  }, []);

  const handleSuggestTakes = useCallback(async () => {
    if (!selectedArticle) return;
    setLoadingSuggestions(true);
    setSuggestError(null);
    setSuggestions([]);
    try {
      const res = await authService.makeAuthenticatedRequest(
        getApiUrl('/api/admin/daily/suggest-takes'),
        {
          method: 'POST',
          body: JSON.stringify({ articleId: selectedArticle.id }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Failed to get suggestions');
      }
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : 'Failed to get suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  }, [selectedArticle]);

  const togglePlatform = (platform: PlatformId) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const activeLimit = Math.min(
    ...selectedPlatforms.map((p) => PLATFORMS.find((pl) => pl.id === p)?.maxChars ?? Infinity)
  );

  const handleAddToQueue = async () => {
    if (!text.trim() || selectedPlatforms.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await authService.makeAuthenticatedRequest(
        getApiUrl('/api/admin/socialPosts'),
        {
          method: 'POST',
          body: JSON.stringify({
            content: text.trim(),
            platforms: selectedPlatforms,
            imageUrl: imageUrl || undefined,
            articleId: selectedArticle?.id || undefined,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Failed to create social post');
      }
      const post = await res.json();
      await updateRun({ hotTakeCreated: true, hotTakePostId: post.id });
      nextStep();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create social post');
    } finally {
      setSubmitting(false);
    }
  };

  const angleLabels: Record<string, { label: string; color: string }> = {
    contrarian: { label: 'Contrarian', color: 'bg-red-100 text-red-700' },
    'data-driven': { label: 'Data-driven', color: 'bg-blue-100 text-blue-700' },
    relatable: { label: 'Relatable', color: 'bg-green-100 text-green-700' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-content">Hot Take Composer</h2>
        <p className="text-sm text-content-secondary mt-1">
          Pick a story, craft your take, and add it to the social queue.
        </p>
      </div>

      {/* Story context */}
      <div>
        <h3 className="text-sm font-medium text-content-secondary uppercase tracking-wide mb-3">
          Top Stories
        </h3>

        {loadingArticles ? (
          <div className="bg-base-200 rounded-lg p-6 text-center text-content-secondary text-sm">
            Loading articles...
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-base-200 rounded-lg p-6 text-center text-content-secondary text-sm">
            No published articles found for today.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Top article (always visible) */}
            <ArticleCard
              article={articles[0]}
              selected={selectedArticle?.id === articles[0].id}
              onSelect={() => {
                setSelectedArticle(articles[0]);
                setSuggestions([]);
              }}
            />

            {/* Remaining articles (expandable) */}
            {articles.length > 1 && (
              <>
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="text-sm text-brand-accent hover:text-brand-accent/80 font-medium transition-colors"
                >
                  {showMore ? 'Show less' : `See ${articles.length - 1} more stories`}
                </button>

                {showMore && (
                  <div className="space-y-2">
                    {articles.slice(1).map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        selected={selectedArticle?.id === article.id}
                        onSelect={() => {
                          setSelectedArticle(article);
                          setSuggestions([]);
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* AI suggestions */}
      {selectedArticle && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={handleSuggestTakes}
              disabled={loadingSuggestions}
              className="px-4 py-2 text-sm font-medium bg-brand-accent text-brand-primary rounded-lg hover:bg-brand-accent/90 transition-colors disabled:opacity-50"
            >
              {loadingSuggestions ? 'Generating...' : 'Suggest Takes'}
            </button>
            {suggestError && (
              <span className="text-sm text-red-600">{suggestError}</span>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-3">
              {suggestions.map((s, i) => {
                const meta = angleLabels[s.angle] || { label: s.angle, color: 'bg-gray-100 text-gray-700' };
                return (
                  <button
                    key={i}
                    onClick={() => setText(s.text)}
                    className="text-left p-3 border border-base-300 rounded-lg hover:border-brand-accent hover:bg-brand-accent/5 transition-colors"
                  >
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${meta.color}`}>
                      {meta.label}
                    </span>
                    <p className="text-sm text-content leading-snug">{s.text}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Platform selector */}
      <div>
        <h3 className="text-sm font-medium text-content-secondary uppercase tracking-wide mb-2">
          Platforms
        </h3>
        <div className="flex flex-wrap gap-3">
          {PLATFORMS.map((p) => (
            <label
              key={p.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                selectedPlatforms.includes(p.id)
                  ? 'border-brand-accent bg-brand-accent/10 text-content'
                  : 'border-base-300 text-content-secondary hover:border-base-400'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedPlatforms.includes(p.id)}
                onChange={() => togglePlatform(p.id)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{p.label}</span>
              <span className="text-xs text-content-secondary">({p.maxChars})</span>
            </label>
          ))}
        </div>
      </div>

      {/* Text composer */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-content-secondary uppercase tracking-wide">
            Your Take
          </h3>
          <span
            className={`text-xs font-mono ${
              text.length > activeLimit ? 'text-red-600 font-bold' : 'text-content-secondary'
            }`}
          >
            {text.length} / {activeLimit === Infinity ? '--' : activeLimit}
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your hot take here..."
          rows={5}
          className="w-full px-4 py-3 border border-base-300 rounded-lg bg-white text-content text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-accent/50 resize-y"
        />
        {text.length > activeLimit && (
          <p className="text-xs text-red-600 mt-1">
            Text exceeds the {activeLimit}-character limit for{' '}
            {selectedPlatforms
              .filter((p) => (PLATFORMS.find((pl) => pl.id === p)?.maxChars ?? Infinity) <= text.length)
              .map((p) => PLATFORMS.find((pl) => pl.id === p)?.label)
              .join(', ')}
          </p>
        )}
      </div>

      {/* Image editor */}
      <div>
        <h3 className="text-sm font-medium text-content-secondary uppercase tracking-wide mb-2">
          Image (optional)
        </h3>
        <ImageEditor
          imageUrl={imageUrl}
          onImageChange={(url) => setImageUrl(url)}
          aspectRatio="1:1"
          context={
            selectedArticle
              ? { title: selectedArticle.title, content: selectedArticle.shortBlurb || '', type: 'social', market: 'AU' }
              : undefined
          }
        />
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={skipStep}
          className="px-4 py-2 text-sm font-medium text-content-secondary hover:text-content transition-colors"
        >
          Skip
        </button>
        <button
          onClick={handleAddToQueue}
          disabled={submitting || !text.trim() || selectedPlatforms.length === 0}
          className="px-5 py-2 text-sm font-medium bg-brand-accent text-brand-primary rounded-lg hover:bg-brand-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Adding...' : 'Add to Queue'}
        </button>
      </div>
    </div>
  );
}

function ArticleCard({
  article,
  selected,
  onSelect,
}: {
  article: Article;
  selected: boolean;
  onSelect: () => void;
}) {
  const resolvedImg = getImageUrl(article.imageUrl);
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left flex gap-3 p-3 rounded-lg border transition-colors ${
        selected
          ? 'border-brand-accent bg-brand-accent/5'
          : 'border-base-300 hover:border-base-400'
      }`}
    >
      {resolvedImg && (
        <img
          src={resolvedImg}
          alt={article.title}
          className="w-16 h-16 rounded object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-content truncate">{article.title}</p>
        {article.shortBlurb && (
          <p className="text-xs text-content-secondary mt-0.5 line-clamp-2">
            {article.shortBlurb}
          </p>
        )}
        {article.relevanceScore != null && (
          <span className="inline-block mt-1 text-xs text-content-secondary bg-base-200 px-2 py-0.5 rounded-full">
            Relevance: {article.relevanceScore}/10
          </span>
        )}
      </div>
    </button>
  );
}
