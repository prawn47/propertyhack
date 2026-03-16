import React, { useState, useEffect } from 'react';
import type { PublicArticle } from '../../services/publicArticleService';
import { CountryLink } from '../../hooks/useCountryPath';
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

function getFirstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0] : text;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

interface ArticleCardProps {
  article: PublicArticle;
  featured?: boolean;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, featured }) => {
  const isFeatured = featured || article.isFeatured;
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const cardClasses = `group block bg-base-100 rounded-xl shadow-soft hover:shadow-medium transition-shadow duration-200 overflow-hidden${isFeatured ? ' border-l-4 border-brand-gold' : ''}`;

  const imageBlock = (
    <div className={`w-full bg-gradient-to-br from-brand-secondary to-brand-primary overflow-hidden${isFeatured ? ' h-64 sm:h-80' : isMobile ? ' h-36' : ' h-48'}`}>
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
  );

  const pillsRow = (
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
          {(() => {
            const loc = article.location;
            const semiParts = loc.split(';').map((s: string) => s.trim());
            if (semiParts.length > 1) return `${semiParts[0]} +${semiParts.length - 1} more`;
            if (loc.length > 35) {
              const m = loc.match(/^([^,]+,\s*[A-Z]{2,3})/);
              return m ? `${m[1]} +more` : loc.slice(0, 32) + '…';
            }
            return loc;
          })()}
        </span>
      )}
      {isFeatured && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-gold text-brand-primary">
          Featured
        </span>
      )}
    </div>
  );

  const titleBlock = (
    <h2 className={`font-bold text-brand-primary leading-tight mb-2 group-hover:text-brand-gold transition-colors${isFeatured ? ' text-xl sm:text-2xl' : ' text-base'}`}>
      {article.title}
    </h2>
  );

  const metaRow = (
    <div className="flex items-center justify-between text-xs text-content-secondary">
      <span className="font-medium truncate">
        {article.source?.name || 'PropertyHack'}
      </span>
      <time dateTime={article.publishedAt || article.createdAt} className="flex-shrink-0 ml-2">
        {formatRelativeTime(article.publishedAt || article.createdAt)}
      </time>
    </div>
  );

  // Mobile: expandable card (no navigation)
  if (isMobile && !isFeatured) {
    const firstSentence = article.shortBlurb ? getFirstSentence(article.shortBlurb) : '';

    return (
      <div className={cardClasses}>
        {imageBlock}
        <div className="p-4">
          {pillsRow}
          {titleBlock}

          {!expanded && firstSentence && (
            <p className="text-content-secondary text-sm leading-relaxed mb-2 line-clamp-1">
              {firstSentence}
            </p>
          )}

          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-sm font-bold text-brand-primary hover:text-brand-gold transition-colors mb-3"
            >
              Read more...
            </button>
          )}

          {expanded && (
            <div className="mb-3">
              {article.shortBlurb && (
                <p className="text-content-secondary text-sm leading-relaxed mb-3">
                  {article.shortBlurb}
                </p>
              )}
              {article.longSummary && (
                <div className="text-content-secondary text-sm leading-relaxed mb-3">
                  {article.longSummary.split('\n').filter(Boolean).map((para, i) => (
                    <p key={i} className={i > 0 ? 'mt-2' : ''}>{para}</p>
                  ))}
                </div>
              )}
              {article.sourceUrl && (
                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-gold hover:text-brand-primary transition-colors mb-3"
                >
                  Read Original Article
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              <button
                onClick={() => setExpanded(false)}
                className="block text-sm font-bold text-content-secondary hover:text-brand-primary transition-colors"
              >
                Show less
              </button>
            </div>
          )}

          {metaRow}
        </div>
      </div>
    );
  }

  // Desktop / tablet: link to detail page (existing behavior)
  return (
    <CountryLink
      to={`/article/${article.slug}`}
      className={cardClasses}
    >
      {imageBlock}
      <div className={`p-4${isFeatured ? ' sm:p-6' : ''}`}>
        {pillsRow}
        {titleBlock}
        {article.shortBlurb && (
          <p className={`text-content-secondary leading-relaxed mb-4${isFeatured ? ' text-base' : ' text-sm line-clamp-3'}`}>
            {article.shortBlurb}
          </p>
        )}
        {metaRow}
      </div>
    </CountryLink>
  );
};

export default ArticleCard;
