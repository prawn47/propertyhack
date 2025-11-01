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
    <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-full">
      <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full">
        <span className="text-sm">🔥</span>
      </div>
      <span className="text-sm font-bold text-emerald-700">{stats.currentStreak}</span>
      <span className="text-xs text-emerald-600">{stats.currentStreak === 1 ? 'day' : 'days'}</span>
    </div>
  );
};

export default GamificationStats;
