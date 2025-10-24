
import React, { useState } from 'react';
import type { UserSettings, DraftPost } from '../types';
import PostCreationWizard from './PostCreationWizard';
import SparklesIcon from './icons/SparklesIcon';

interface ContentGeneratorProps {
  settings: UserSettings;
  onNewDraft: (draft: DraftPost) => void;
  onPublish: (draft: DraftPost) => void;
}

const ContentGenerator: React.FC<ContentGeneratorProps> = ({ settings, onNewDraft, onPublish }) => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <>
      <div className="bg-base-100 p-6 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
                 <h2 className="text-lg font-semibold text-content">Ready to create?</h2>
                 <p className="text-sm text-content-secondary mt-1">Start by telling the AI what you want to post about.</p>
            </div>
            <button
                onClick={() => setIsWizardOpen(true)}
                className="flex items-center justify-center w-full sm:w-auto px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary"
            >
                <SparklesIcon className="w-5 h-5 mr-2" />
                Generate New Post
            </button>
        </div>
      </div>
      {isWizardOpen && (
        <PostCreationWizard
          settings={settings}
          onAddToDrafts={onNewDraft}
          onPublish={onPublish}
          onClose={() => setIsWizardOpen(false)}
        />
      )}
    </>
  );
};

export default ContentGenerator;