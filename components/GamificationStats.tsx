import React, { useState, useEffect } from 'react';
import { getStreakStats, type StreakStats } from '../services/statsService';
import Loader from './Loader';

const GamificationStats: React.FC = () => {
  const [stats, setStats] = useState<StreakStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const streakStats = await getStreakStats();
        setStats(streakStats);
      } catch (err) {
        console.error('Failed to load streak stats:', err);
        setError('Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-base-100 border-b border-base-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center">
            <Loader className="h-5 w-5 text-brand-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-base-100 border-b border-base-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-sm text-red-500 text-center">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-colors
      bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200
      dark:from-emerald-900/30 dark:to-teal-900/30 dark:border-emerald-700/50">
      <div className="flex items-center justify-center w-6 h-6 rounded-full transition-colors
        bg-gradient-to-br from-emerald-400 to-teal-500
        dark:from-emerald-500 dark:to-teal-600">
        <span className="text-sm">🔥</span>
      </div>
      <span className="text-sm font-bold transition-colors
        text-emerald-700
        dark:text-emerald-300">
        {stats.currentStreak}
      </span>
      <span className="text-xs transition-colors
        text-emerald-600
        dark:text-emerald-400">
        {stats.currentStreak === 1 ? 'day' : 'days'}
      </span>
    </div>
  );
};

export default GamificationStats;
