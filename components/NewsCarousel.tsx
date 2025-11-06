import React, { useState, useEffect } from 'react';
import type { NewsArticle } from '../types';
import Loader from './Loader';
import { getApiUrl } from '../services/apiConfig';

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

      const response = await fetch(getApiUrl('/api/news?limit=10'), {
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

      const response = await fetch(getApiUrl('/api/news/refresh'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Refresh response:', data);
        console.log('Articles array:', data.articles);
        setArticles(data.articles || []);
      } else {
        console.error('Refresh failed:', response.status, await response.text());
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

      await fetch(getApiUrl(`/api/news/${articleId}/read`), {
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

      <div className="space-y-4">
        {articles.map((article) => (
          <div
            key={article.id}
            className="rounded-lg p-4 transition-colors bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-semibold px-2 py-1 rounded
                text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40">
                {article.source}
              </span>
              {article.publishedAt && (
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {new Date(article.publishedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <h3 className="font-semibold mb-2 text-lg text-gray-900 dark:text-white">
              {article.title}
            </h3>

            <p className="text-sm mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              {article.summary}
            </p>

            {article.category && (
              <span className="inline-block text-xs mb-3 text-gray-600 dark:text-gray-400">
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
                className="px-3 py-2 border-2 text-sm font-medium rounded transition-colors
                  border-gray-300 dark:border-gray-600
                  text-gray-900 dark:text-white
                  hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                🔗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsCarousel;
