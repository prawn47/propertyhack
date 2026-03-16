import React, { useState, useEffect } from 'react';
import { getRelatedArticles } from '../../services/publicArticleService';
import { CountryLink } from '../../hooks/useCountryPath';
import type { PublicArticle } from '../../services/publicArticleService';
import ArticleImagePlaceholder from '../shared/ArticleImagePlaceholder';
import { getImageUrl } from '../../services/apiConfig';

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Recently';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface RelatedArticleCardProps {
  article: PublicArticle;
}

const RelatedArticleCard: React.FC<RelatedArticleCardProps> = ({ article }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <CountryLink
      to={`/article/${article.slug}`}
      className="group bg-base-100 rounded-xl overflow-hidden shadow-soft hover:shadow-medium transition-shadow duration-200"
    >
      <div className="h-36 bg-gradient-to-br from-brand-secondary to-brand-primary overflow-hidden">
        {article.imageUrl && !imgError ? (
          <img
            src={getImageUrl(article.imageUrl)}
            alt={article.imageAltText || article.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <ArticleImagePlaceholder category={article.category} />
        )}
      </div>
      <div className="p-4">
        {article.category && (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-brand-gold/10 text-brand-primary border border-brand-gold/20 mb-2">
            {article.category}
          </span>
        )}
        <h3 className="font-semibold text-brand-primary text-sm leading-snug mb-2 line-clamp-2 group-hover:text-brand-gold transition-colors">
          {article.title}
        </h3>
        {article.shortBlurb && (
          <p className="text-xs text-content-secondary line-clamp-2 mb-3">{article.shortBlurb}</p>
        )}
        <time className="text-xs text-content-secondary">
          {formatRelativeTime(article.publishedAt || article.createdAt)}
        </time>
      </div>
    </CountryLink>
  );
};

interface RelatedArticlesProps {
  slug: string;
}

const RelatedArticles: React.FC<RelatedArticlesProps> = ({ slug }) => {
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRelatedArticles(slug)
      .then((data) => {
        if (!cancelled) {
          setArticles(data.articles);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <section className="mt-12">
        <h2 className="text-xl font-bold text-brand-primary mb-6">Related Articles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-base-100 rounded-xl overflow-hidden shadow-soft animate-pulse">
              <div className="h-36 bg-base-300" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-base-300 rounded w-1/3" />
                <div className="h-4 bg-base-300 rounded w-full" />
                <div className="h-4 bg-base-300 rounded w-4/5" />
                <div className="h-3 bg-base-300 rounded w-1/4 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (articles.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-brand-primary mb-6">Related Articles</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article) => (
          <RelatedArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
};

export default RelatedArticles;
