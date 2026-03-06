import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-4',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md' }) => {
  return (
    <div className="flex items-center justify-center w-full py-8">
      <div
        className={[
          sizeClasses[size],
          'rounded-full border-brand-gold border-t-transparent animate-spin',
        ].join(' ')}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
};

export default LoadingSpinner;
