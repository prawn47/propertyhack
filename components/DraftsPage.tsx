import React from 'react';
import DashboardSection from './DashboardSection';
import type { DraftPost } from '../types';

interface DraftsPageProps {
  drafts: DraftPost[];
  onSelectDraft: (draft: DraftPost) => void;
  onDeleteDraft: (draft: DraftPost) => Promise<void>;
}

const DraftsPage: React.FC<DraftsPageProps> = ({
  drafts,
  onSelectDraft,
  onDeleteDraft,
}) => {
  return (
    <div className="max-w-5xl mx-auto">
      <DashboardSection 
        title="Drafts" 
        posts={drafts} 
        onSelectPost={onSelectDraft}
        onDeletePost={onDeleteDraft}
      />
    </div>
  );
};

export default DraftsPage;
