import React, { useState, useEffect } from 'react';
import type { NewsArticle } from '../types';
import Loader from './Loader';

interface NewsCarouselProps {
  onCommentOnArticle: (article: NewsArticle) => void;
}

const NewsCarousel: React.FC<NewsCarouselProps> = ({ onCommentOnArticle }) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('http://localhost:3001/api/news?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setArticles(data);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('http://localhost:3001/api/news/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
      }
    } catch (error) {
      console.error('Error refreshing news:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkAsRead = async (articleId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await fetch(`http://localhost:3001/api/news/${articleId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Update local state
      setArticles(prev => prev.map(a => 
        a.id === articleId ? { ...a, isRead: true } : a
      ));
    } catch (error) {
      console.error('Error marking article as read:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-base-100 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <Loader className="h-8 w-8 text-brand-primary" />
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="bg-base-100 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-content">📰 News For You</h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1 text-sm bg-brand-primary text-white rounded hover:bg-brand-secondary disabled:bg-gray-400"
          >
            {isRefreshing ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
        <p className="text-content-secondary text-center py-8">
          No news articles yet. Click refresh to fetch curated news based on your interests.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-content">📰 News For You</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-1 text-sm bg-brand-primary text-white rounded hover:bg-brand-secondary disabled:bg-gray-400 flex items-center gap-1"
        >
          {isRefreshing ? (
            <>
              <Loader className="w-4 h-4" />
              Refreshing...
            </>
          ) : (
            '🔄 Refresh'
          )}
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {articles.map((article) => (
          <div
            key={article.id}
            className={`flex-shrink-0 w-80 bg-white border rounded-lg p-4 snap-start ${
              article.isRead ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded">
                {article.source}
              </span>
              {article.publishedAt && (
                <span className="text-xs text-gray-500">
                  {new Date(article.publishedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
              {article.title}
            </h3>

            <p className="text-sm text-gray-600 mb-4 line-clamp-3">
              {article.summary}
            </p>

            {article.category && (
              <span className="inline-block text-xs text-gray-500 mb-3">
                #{article.category}
              </span>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleMarkAsRead(article.id);
                  onCommentOnArticle(article);
                }}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
              >
                💬 Comment & Post
              </button>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleMarkAsRead(article.id)}
                className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50"
              >
                🔗
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 mt-2">
        {articles.map((_, index) => (
          <div
            key={index}
            className="w-2 h-2 rounded-full bg-gray-300"
          />
        ))}
      </div>
    </div>
  );
};

export default NewsCarousel;
