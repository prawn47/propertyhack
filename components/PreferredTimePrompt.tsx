import React, { useState, useEffect } from 'react';
import type { UserSettings } from '../types';
import { getStreakStats, type StreakStats } from '../services/statsService';

interface PreferredTimePromptProps {
  settings: UserSettings;
  onCreatePost: () => void;
}

const PreferredTimePrompt: React.FC<PreferredTimePromptProps> = ({ settings, onCreatePost }) => {
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [stats, setStats] = useState<StreakStats | null>(null);

  useEffect(() => {
    const checkPromptConditions = async () => {
      try {
        // Get current stats to check if user posted today
        const streakStats = await getStreakStats();
        setStats(streakStats);

        // Check if user has posted today
        const today = new Date();
        const lastPostDate = streakStats.lastPostDate ? new Date(streakStats.lastPostDate) : null;
        
        const hasPostedToday = lastPostDate && 
          lastPostDate.toDateString() === today.toDateString();

        if (hasPostedToday) {
          setShouldShowPrompt(false);
          return;
        }

        // Check if it's past the user's preferred time
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
        
        // Parse preferred time (format: "HH:mm")
        const [preferredHour, preferredMinute] = settings.preferredTime.split(':').map(Number);
        const preferredTimeMinutes = preferredHour * 60 + preferredMinute;

        // Show prompt if it's past preferred time and user hasn't posted today
        if (currentTime >= preferredTimeMinutes && !hasPostedToday && !isDismissed) {
          setShouldShowPrompt(true);
        } else {
          setShouldShowPrompt(false);
        }
      } catch (error) {
        console.error('Failed to check prompt conditions:', error);
        setShouldShowPrompt(false);
      }
    };

    // Check immediately and then every 15 minutes
    checkPromptConditions();
    const interval = setInterval(checkPromptConditions, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [settings.preferredTime, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShouldShowPrompt(false);
  };

  const handleCreatePost = () => {
    onCreatePost();
    setIsDismissed(true);
    setShouldShowPrompt(false);
  };

  if (!shouldShowPrompt) return null;

  const getPromptMessage = () => {
    if (stats?.currentStreak === 0) {
      return "Ready to start your posting streak? ✨";
    } else if (stats?.currentStreak && stats.currentStreak > 0) {
      return `Don't break your ${stats.currentStreak}-day streak! 🔥`;
    } else {
      return "Time for your daily LinkedIn post! 📝";
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">⏰</div>
          <div>
            <p className="font-medium text-blue-800">
              {getPromptMessage()}
            </p>
            <p className="text-sm text-blue-600">
              It's past your preferred posting time ({settings.preferredTime})
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCreatePost}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Create Post
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreferredTimePrompt;
