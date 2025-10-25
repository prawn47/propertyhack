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
      <div className="bg-base-100 p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center h-24">
          <Loader className="h-6 w-6 text-brand-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-base-100 p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-2 text-content">Your Progress</h2>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-base-100 p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4 text-content">Your Progress</h2>
      
      <div className="space-y-4">
        {/* Current Streak */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="font-medium text-content">Current Streak</p>
              <p className="text-xs text-content-secondary">Days in a row</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-orange-500">{stats.currentStreak}</p>
            <p className="text-xs text-content-secondary">
              Best: {stats.longestStreak}
            </p>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">📊</span>
              <div>
                <p className="font-medium text-content">Weekly Progress</p>
                <p className="text-xs text-content-secondary">
                  {stats.postsThisWeek} of {stats.weeklyTarget} posts
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-500">{stats.weeklyProgress}%</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.weeklyProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Encouragement Message */}
        <div className="pt-2 border-t border-base-300">
          {stats.currentStreak === 0 ? (
            <p className="text-sm text-content-secondary">
              🌟 Start your posting streak today!
            </p>
          ) : stats.currentStreak === 1 ? (
            <p className="text-sm text-content-secondary">
              🎉 Great start! Keep it going tomorrow.
            </p>
          ) : stats.currentStreak < 7 ? (
            <p className="text-sm text-content-secondary">
              💪 You're building momentum! Keep it up.
            </p>
          ) : (
            <p className="text-sm text-content-secondary">
              🏆 Amazing streak! You're on fire!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamificationStats;
