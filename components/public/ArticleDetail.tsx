import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPublicArticle } from '../../services/publicArticleService';
import type { PublicArticle } from '../../services/publicArticleService';
import RelatedArticles from './RelatedArticles';
import Loader from '../Loader';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Recently published';
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function renderLongSummary(text: string): React.ReactNode {
  return text.split(/\n\n+/).map((para, i) => (
    <p key={i} className="mb-4 leading-relaxed">
      {para.replace(/\n/g, ' ')}
    </p>
  ));
}

const ShareButton: React.FC<{ href?: string; onClick?: () => void; label: string; children: React.ReactNode }> = ({
  href,
  onClick,
  label,
  children,
}) => {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-base-300 text-content-secondary hover:border-brand-gold hover:text-brand-gold transition-colors duration-150';
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={base}>
        {children}
        <span>{label}</span>
      </a>
    );
  }
  return (
    <button onClick={onClick} aria-label={label} className={base}>
      {children}
      <span>{label}</span>
    </button>
  );
};

interface ArticleDetailProps {
  onAdminClick?: () => void;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({ onAdminClick }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<PublicArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getPublicArticle(slug)
      .then((data) => {
        if (!cancelled) {
          setArticle(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          if (err.message === 'Article not found') setNotFound(true);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [slug]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silent fail
    }
  };

  const pageUrl = encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '');
  const pageTitle = encodeURIComponent(article?.title || '');

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-brand-accent sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3">
            <img src="/ph-logo.jpg" alt="Property Hack" className="h-10 w-10 rounded-[12px]" />
            <span className="text-xl font-bold text-gray-900">PropertyHack</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-content-secondary hover:text-brand-gold transition-colors">
              ← All Articles
            </Link>
            {onAdminClick && (
              <button
                onClick={onAdminClick}
                className="text-sm text-content-secondary hover:text-brand-gold transition-colors"
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {loading && (
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader className="h-10 w-10 text-brand-primary" />
        </div>
      )}

      {!loading && notFound && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
          <h1 className="text-2xl font-bold text-brand-primary mb-3">Article not found</h1>
          <p className="text-content-secondary mb-6">This article may have been removed or the link is incorrect.</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-brand-gold text-brand-primary font-semibold rounded-lg hover:bg-brand-gold/90 transition-colors"
          >
            Back to Articles
          </button>
        </div>
      )}

      {!loading && article && (
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Article card */}
            <article className="bg-base-100 rounded-2xl shadow-medium overflow-hidden">

              {/* Hero image */}
              <div className="w-full h-64 sm:h-80 lg:h-96 bg-gradient-to-br from-brand-secondary to-brand-primary overflow-hidden">
                {article.imageUrl ? (
                  <img
                    src={article.imageUrl}
                    alt={article.imageAltText || article.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-16 h-16 text-brand-gold/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="p-6 sm:p-8 lg:p-10">
                {/* Meta pills */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {article.category && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-gold/10 text-brand-primary border border-brand-gold/30">
                      {article.category}
                    </span>
                  )}
                  {article.location && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-base-200 text-content-secondary border border-base-300">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {article.location}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-brand-primary leading-tight mb-4">
                  {article.title}
                </h1>

                {/* Meta line */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-content-secondary mb-6 pb-6 border-b border-base-300">
                  {article.source && (
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-gold hover:underline"
                    >
                      {article.source.name}
                    </a>
                  )}
                  <time dateTime={article.publishedAt || article.createdAt}>
                    {formatDate(article.publishedAt || article.createdAt)}
                  </time>
                  {article.viewCount > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {article.viewCount.toLocaleString()} views
                    </span>
                  )}
                </div>

                {/* Long summary body */}
                {article.longSummary ? (
                  <div className="text-base sm:text-lg text-content leading-relaxed mb-8">
                    {renderLongSummary(article.longSummary)}
                  </div>
                ) : article.shortBlurb ? (
                  <div className="text-base sm:text-lg text-content leading-relaxed mb-8">
                    <p>{article.shortBlurb}</p>
                  </div>
                ) : null}

                {/* Read Original Article CTA */}
                <div className="mb-8">
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-primary font-bold rounded-xl hover:bg-brand-gold/90 transition-colors duration-150 shadow-soft"
                  >
                    Read Original Article
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                {/* Share buttons */}
                <div className="pt-6 border-t border-base-300">
                  <p className="text-sm font-semibold text-content-secondary mb-3">Share this article</p>
                  <div className="flex flex-wrap gap-2">
                    <ShareButton
                      onClick={handleCopyLink}
                      label={copied ? 'Copied!' : 'Copy Link'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </ShareButton>
                    <ShareButton
                      href={`https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`}
                      label="Twitter"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </ShareButton>
                    <ShareButton
                      href={`https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`}
                      label="Facebook"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </ShareButton>
                    <ShareButton
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`}
                      label="LinkedIn"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </ShareButton>
                  </div>
                </div>
              </div>
            </article>

            {/* Related articles */}
            <RelatedArticles slug={slug!} />
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="bg-brand-primary text-white/50 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <span>
            <span className="text-white/70 font-medium">PropertyHack</span>
            {' '}&copy; {new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default ArticleDetail;
