import React from 'react';
import DashboardSection from './DashboardSection';
import type { PublishedPost } from '../types';

interface PublishedPageProps {
  published: PublishedPost[];
}

const PublishedPage: React.FC<PublishedPageProps> = ({ published }) => {
  return (
    <div className="max-w-5xl mx-auto">
      <DashboardSection
        title="Published Posts"
        posts={published}
      />
    </div>
  );
};

export default PublishedPage;
