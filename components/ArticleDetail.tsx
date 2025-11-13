import React, { useState, useEffect } from 'react';
import type { Article } from '../types';
import Loader from './Loader';

interface ArticleDetailProps {
  slug: string;
  onBack: () => void;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({ slug, onBack }) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticle();
  }, [slug]);

  const loadArticle = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/public/articles/${slug}`);
      const data = await response.json();
      setArticle(data);
    } catch (error) {
      console.error('Failed to load article:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader className="h-10 w-10 text-blue-600" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-4">Article not found</p>
          <button onClick={onBack} className="text-blue-600 hover:text-blue-700">
            ← Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-brand-accent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button 
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            ← Back to Property Hack
          </button>
          <div className="flex items-center space-x-3">
            <img src="/ph-logo.jpg" alt="Property Hack" className="h-12 w-12 rounded-[15px]" />
            <h1 className="text-4xl font-bold text-gray-900">Property Hack</h1>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="bg-white rounded-lg shadow-lg gold-frame-subtle overflow-hidden">
          {/* Featured Image */}
          {article.imageUrl && (
            <div className="w-full h-96 bg-gray-100 flex items-center justify-center p-8">
              <img 
                src={article.imageUrl}
                alt={article.imageAltText || article.title}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          
          <div className="p-8">
            {/* Category & Date */}
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
              <span className="px-3 py-1 bg-brand-accent/10 text-brand-primary rounded font-medium">
                {article.category?.name || 'News'}
              </span>
              <span>•</span>
              <time dateTime={article.publishedAt}>
                {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }) : 'Recently published'}
              </time>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">
              {article.title}
            </h1>

            {/* Meta Description */}
            {article.metaDescription && (
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {article.metaDescription}
              </p>
            )}

            {/* Summary Content */}
            <div 
              className="prose prose-lg max-w-none mb-8 [&>p]:mb-6 [&>h2]:mt-8 [&>h2]:mb-4 [&>h3]:mt-6 [&>h3]:mb-3"
              dangerouslySetInnerHTML={{ __html: article.summary }}
            />

            {/* Keywords */}
            {article.focusKeywords && article.focusKeywords.length > 0 && (
              <div className="mb-8 pb-8 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {article.focusKeywords.map((keyword, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 bg-brand-accent/10 text-brand-primary rounded-full text-sm font-medium"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source Attribution */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <p className="text-sm text-gray-600 mb-3">
                This is a summary of an article originally published by <strong>{article.sourceName}</strong>.
              </p>
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-all duration-200 font-medium border border-brand-accent hover:shadow-lg"
              >
                Read Original Article →
              </a>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
};

export default ArticleDetail;
