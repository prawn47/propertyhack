import React, { useState, useEffect } from 'react';
import type { Article } from '../../types';
import Loader from '../Loader';

interface PublicArticlesGridProps {
  onAdminClick: () => void;
}

const PublicArticlesGrid: React.FC<PublicArticlesGridProps> = ({ onAdminClick }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/public/articles?limit=20`);
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (err) {
      console.error('Failed to load articles:', err);
      setError('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b-2 border-brand-accent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img src="/ph-logo.jpg" alt="Property Hack" className="h-12 w-12 rounded-[15px]" />
              <h1 className="text-3xl font-bold text-gray-900">PropertyHack</h1>
            </div>
            <button
              onClick={onAdminClick}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Admin Login
            </button>
          </div>
        </header>
        <div className="flex items-center justify-center py-20">
          <Loader className="h-10 w-10 text-brand-primary" />
        </div>
      </div>
    );
  }

  if (error || articles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b-2 border-brand-accent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img src="/ph-logo.jpg" alt="Property Hack" className="h-12 w-12 rounded-[15px]" />
              <h1 className="text-3xl font-bold text-gray-900">PropertyHack</h1>
            </div>
            <button
              onClick={onAdminClick}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Admin Login
            </button>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Articles Yet</h2>
          <p className="text-gray-600">Check back soon for Australian property insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-brand-accent sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img src="/ph-logo.jpg" alt="Property Hack" className="h-12 w-12 rounded-[15px]" />
            <h1 className="text-3xl font-bold text-gray-900">PropertyHack</h1>
          </div>
          <button
            onClick={onAdminClick}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Admin Login
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-brand-primary via-brand-secondary to-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Agenda-Free Australian Property News
          </h2>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            AI-curated insights from across the Australian property market
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => (
            <article
              key={article.id}
              className={`bg-white rounded-lg shadow-soft overflow-hidden hover-lift cursor-pointer transition-all duration-200 ${
                article.featured ? 'md:col-span-2 lg:col-span-3' : ''
              }`}
            >
              <a href={`/articles/${article.slug}`} className="block">
                {/* Article Image */}
                {article.imageUrl && (
                  <div className={`w-full bg-gray-100 ${article.featured ? 'h-96' : 'h-48'}`}>
                    <img
                      src={article.imageUrl}
                      alt={article.imageAltText || article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-6">
                  {/* Category & Date */}
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    {article.category && (
                      <span className="px-3 py-1 bg-brand-accent/10 text-brand-primary rounded font-medium">
                        {article.category.name}
                      </span>
                    )}
                    {article.featured && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                        Featured
                      </span>
                    )}
                    <span>•</span>
                    <time dateTime={article.publishedAt}>
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Recently'}
                    </time>
                  </div>

                  {/* Title */}
                  <h2 className={`font-bold text-gray-900 mb-3 leading-tight ${
                    article.featured ? 'text-3xl' : 'text-xl'
                  }`}>
                    {article.title}
                  </h2>

                  {/* Meta Description */}
                  <p className={`text-gray-600 mb-4 ${article.featured ? 'text-lg' : 'text-base'}`}>
                    {article.metaDescription}
                  </p>

                  {/* Source */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {article.sourceLogoUrl && (
                        <img
                          src={article.sourceLogoUrl}
                          alt={article.sourceName}
                          className="h-4 w-4 object-contain"
                        />
                      )}
                      <span>{article.sourceName}</span>
                    </div>
                    <span className="text-brand-primary font-medium text-sm hover:text-brand-secondary">
                      Read more →
                    </span>
                  </div>
                </div>
              </a>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PublicArticlesGrid;
