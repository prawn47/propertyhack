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
    <div className="bg-base-100 border-b border-base-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
          {/* Current Streak */}
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-xs text-content-secondary">Current Streak</p>
              <p className="text-lg font-bold text-orange-500">{stats.currentStreak} days</p>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📊</span>
            <div>
              <p className="text-xs text-content-secondary">Weekly Progress</p>
              <div className="flex items-center space-x-2">
                <p className="text-lg font-bold text-blue-500">{stats.weeklyProgress}%</p>
                <span className="text-xs text-content-secondary">({stats.postsThisWeek}/{stats.weeklyTarget})</span>
              </div>
            </div>
          </div>

          {/* Best Streak */}
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-xs text-content-secondary">Best Streak</p>
              <p className="text-lg font-bold text-content">{stats.longestStreak} days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamificationStats;
