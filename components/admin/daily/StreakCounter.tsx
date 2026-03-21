import React from 'react';

interface StreakCounterProps {
  streak: number;
  maxStreak?: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: {
    container: 'flex items-center gap-1.5',
    icon: 'text-lg',
    number: 'text-lg font-bold',
    label: 'text-xs',
    best: 'text-xs',
  },
  md: {
    container: 'flex flex-col items-center gap-1',
    icon: 'text-3xl',
    number: 'text-3xl font-bold',
    label: 'text-sm',
    best: 'text-xs',
  },
  lg: {
    container: 'flex flex-col items-center gap-2',
    icon: 'text-5xl',
    number: 'text-5xl font-extrabold',
    label: 'text-base',
    best: 'text-sm',
  },
};

const StreakCounter: React.FC<StreakCounterProps> = ({ streak, maxStreak, size = 'md' }) => {
  const s = sizeConfig[size];
  const isActive = streak > 0;
  const colorClass = isActive ? 'text-brand-gold' : 'text-gray-400';

  if (size === 'sm') {
    return (
      <div className={s.container}>
        <span className={s.icon}>{isActive ? '🔥' : '🔥'}</span>
        <span className={`${s.number} ${colorClass}`}>{streak}</span>
        <span className={`${s.label} ${isActive ? 'text-content-secondary' : 'text-gray-400'}`}>
          day streak
        </span>
      </div>
    );
  }

  return (
    <div className={s.container}>
      <span className={s.icon}>{isActive ? '🔥' : '🔥'}</span>
      <span className={`${s.number} ${colorClass}`}>{streak}</span>
      <span className={`${s.label} ${isActive ? 'text-content-secondary' : 'text-gray-400'}`}>
        {streak === 1 ? '1 day streak!' : `${streak} day streak!`}
      </span>
      {maxStreak !== undefined && maxStreak > 0 && (
        <span className={`${s.best} text-content-secondary`}>
          Best: {maxStreak} {maxStreak === 1 ? 'day' : 'days'}
        </span>
      )}
    </div>
  );
};

export default StreakCounter;
