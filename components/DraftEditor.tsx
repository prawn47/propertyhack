import React, { useRef } from 'react';
import type { DraftPost } from '../types';
import UploadIcon from './icons/UploadIcon';
import PostIcon from './icons/PostIcon';
import Loader from './Loader';

interface DraftEditorProps {
  draft: DraftPost;
  onPublish: (draft: DraftPost) => void;
  onUpdate: (updatedDraft: DraftPost) => void;
  onClose: () => void;
}

const DraftEditor: React.FC<DraftEditorProps> = ({ draft, onPublish, onUpdate, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...draft, title: e.target.value });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...draft, text: e.target.value });
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({ ...draft, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-base-100 p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-content">Edit Draft</h2>
            <button onClick={onClose} className="text-sm font-semibold text-content-secondary hover:text-content">
                &times; Close
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="draftTitle" className="block text-sm font-medium text-content-secondary">
                Post Title
              </label>
              <input
                type="text"
                id="draftTitle"
                value={draft.title}
                onChange={handleTitleChange}
                className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm font-semibold focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="draftText" className="block text-sm font-medium text-content-secondary">
                Post Text
              </label>
              <textarea
                id="draftText"
                value={draft.text}
                onChange={handleTextChange}
                rows={10}
                className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary">
                Post Image
              </label>
              {draft.imageUrl ? (
                <div className="mt-2 relative group">
                  <img src={draft.imageUrl} alt="Generated post visual" className="w-full h-auto max-h-80 object-cover rounded-md" />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-opacity rounded-md">
                     <button onClick={handleImageUploadClick} className="opacity-0 group-hover:opacity-100 flex items-center px-4 py-2 bg-white text-black rounded-md text-sm font-medium">
                        <UploadIcon className="w-4 h-4 mr-2" />
                        Replace Image
                     </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-base-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                     <svg className="mx-auto h-12 w-12 text-content-secondary" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <div className="flex text-sm text-content-secondary">
                      <button onClick={handleImageUploadClick} className="relative bg-base-100 rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-primary">
                        <span>Upload a file</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => onPublish(draft)}
                disabled={draft.isPublishing}
                className="flex items-center justify-center w-48 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
              >
                {draft.isPublishing ? (
                    <>
                        <Loader className="w-5 h-5 mr-2" />
                        Publishing...
                    </>
                ) : (
                    <>
                        <PostIcon className="w-5 h-5 mr-2" />
                        Publish to LinkedIn
                    </>
                )}
              </button>
            </div>
          </div>
        </div>
    </div>
  );
};

export default DraftEditor;
