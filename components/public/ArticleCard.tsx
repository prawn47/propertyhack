import React from 'react';
import type { PublicArticle } from '../../services/publicArticleService';
import { CountryLink } from '../../hooks/useCountryPath';

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

interface ArticleCardProps {
  article: PublicArticle;
  featured?: boolean;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, featured }) => {
  const isFeatured = featured || article.isFeatured;

  return (
    <CountryLink
      to={`/articles/${article.slug}`}
      className={`group block bg-base-100 rounded-xl shadow-soft hover:shadow-medium transition-shadow duration-200 overflow-hidden${isFeatured ? ' border-l-4 border-brand-gold' : ''}`}
    >
      {/* Image */}
      <div className={`w-full bg-gradient-to-br from-brand-secondary to-brand-primary overflow-hidden${isFeatured ? ' h-64 sm:h-80' : ' h-48'}`}>
        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt={article.imageAltText || article.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-brand-gold/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`p-4${isFeatured ? ' sm:p-6' : ''}`}>
        {/* Pills row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {article.category && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-gold/10 text-brand-primary border border-brand-gold/20">
              {article.category}
            </span>
          )}
          {article.location && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-base-200 text-content-secondary border border-base-300">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {article.location}
            </span>
          )}
          {isFeatured && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-gold text-brand-primary">
              Featured
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className={`font-bold text-brand-primary leading-tight mb-2 group-hover:text-brand-gold transition-colors${isFeatured ? ' text-xl sm:text-2xl' : ' text-base'}`}>
          {article.title}
        </h2>

        {/* Blurb */}
        {article.shortBlurb && (
          <p className={`text-content-secondary leading-relaxed mb-4${isFeatured ? ' text-base' : ' text-sm line-clamp-3'}`}>
            {article.shortBlurb}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between text-xs text-content-secondary">
          <span className="font-medium truncate">
            {article.source?.name || 'PropertyHack'}
          </span>
          <time dateTime={article.publishedAt || article.createdAt} className="flex-shrink-0 ml-2">
            {formatRelativeTime(article.publishedAt || article.createdAt)}
          </time>
        </div>
      </div>
    </CountryLink>
  );
};

export default ArticleCard;
