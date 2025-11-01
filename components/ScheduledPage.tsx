import React from 'react';
import DashboardSection from './DashboardSection';
import type { ScheduledPost } from '../types';

interface ScheduledPageProps {
  scheduled: ScheduledPost[];
  onSelectScheduled: (post: ScheduledPost) => void;
  onReschedulePost: (post: ScheduledPost) => void;
  onCancelPost: (post: ScheduledPost) => void;
}

const ScheduledPage: React.FC<ScheduledPageProps> = ({
  scheduled,
  onSelectScheduled,
  onReschedulePost,
  onCancelPost,
}) => {
  return (
    <div className="max-w-5xl mx-auto">
      <DashboardSection
        title="Scheduled Posts"
        posts={scheduled}
        onSelectPost={onSelectScheduled}
        onReschedulePost={onReschedulePost}
        onCancelPost={onCancelPost}
      />
    </div>
  );
};

export default ScheduledPage;
