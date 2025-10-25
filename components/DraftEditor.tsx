import React, { useRef, useState } from 'react';
import type { DraftPost, UserSettings } from '../types';
import UploadIcon from './icons/UploadIcon';
import PostIcon from './icons/PostIcon';
import Loader from './Loader';
import { enhanceImage, generateConciseForX } from '../services/geminiService';

interface DraftEditorProps {
  draft: DraftPost;
  settings: UserSettings;
  onPublish: (draft: DraftPost) => void;
  onUpdate: (updatedDraft: DraftPost) => void;
  onClose: () => void;
}

const DraftEditor: React.FC<DraftEditorProps> = ({ draft, settings, onPublish, onUpdate, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [isPreparingForX, setIsPreparingForX] = useState(false);
  const [xVersion, setXVersion] = useState('');
  const [isGeneratingXVersion, setIsGeneratingXVersion] = useState(false);

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

  const handleEditImageWithAI = async () => {
    if (!draft.imageUrl || !editPrompt.trim()) return;
    
    setIsEditingImage(true);
    try {
      console.log('Starting AI image edit with prompt:', editPrompt.trim());
      console.log('Image URL:', draft.imageUrl.substring(0, 50) + '...');
      
      const editedImageUrl = await enhanceImage(draft.imageUrl, editPrompt.trim());
      if (editedImageUrl) {
        console.log('AI image edit successful');
        onUpdate({ ...draft, imageUrl: editedImageUrl });
        setEditPrompt('');
        setShowEditPrompt(false);
      } else {
        console.warn('AI image edit returned no result');
        alert('Failed to edit image with AI. The AI service may be unavailable or the image format is not supported.');
      }
    } catch (error) {
      console.error('Error editing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to edit image with AI: ${errorMessage}`);
    } finally {
      setIsEditingImage(false);
    }
  };

  const handlePrepareForX = async () => {
    setIsPreparingForX(true);
    await handleGenerateXVersion();
  };

  const handleGenerateXVersion = async () => {
    if (!draft.title || !draft.text) return;
    
    setIsGeneratingXVersion(true);
    try {
      const conciseVersion = await generateConciseForX(
        draft.title,
        draft.text,
        settings
      );
      if (conciseVersion) {
        setXVersion(conciseVersion);
      } else {
        alert('Failed to generate X version. Please try again.');
      }
    } catch (error) {
      console.error('Error generating X version:', error);
      alert('Failed to generate X version. Please try again.');
    } finally {
      setIsGeneratingXVersion(false);
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
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-content-secondary">
                  {draft.text.length} characters
                </span>
                <button
                  onClick={handlePrepareForX}
                  className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  𝕏 Prepare for X
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary">
                Post Image
              </label>
              {draft.imageUrl ? (
                <div className="mt-2 space-y-2">
                  <img src={draft.imageUrl} alt="Generated post visual" className="w-full h-auto max-h-80 object-cover rounded-md" />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleImageUploadClick} 
                      className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      <UploadIcon className="w-4 h-4 mr-2" />
                      Replace Image
                    </button>
                    <button 
                      onClick={() => setShowEditPrompt(!showEditPrompt)} 
                      className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200 transition-colors"
                      disabled={isEditingImage}
                    >
                      {isEditingImage ? (
                        <>
                          <Loader className="w-4 h-4 mr-2" />
                          Editing...
                        </>
                      ) : (
                        <>
                          ✨ Edit with AI
                        </>
                      )}
                    </button>
                  </div>
                  {showEditPrompt && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                      <label className="block text-sm font-medium text-blue-700 mb-2">
                        Describe how you want to edit the image:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          placeholder="e.g., make it more colorful, add a professional background..."
                          className="flex-1 px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isEditingImage}
                        />
                        <button
                          onClick={handleEditImageWithAI}
                          disabled={!editPrompt.trim() || isEditingImage}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
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

            {/* X.com Preparation Section */}
            {isPreparingForX && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="text-lg font-semibold text-purple-800 mb-3">Prepare for X (Twitter)</h4>
                <p className="text-sm text-purple-600 mb-4">
                  Create a concise version of your post optimized for X's character limit and audience.
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-1">
                      X Version (Character limit: 280)
                    </label>
                    <textarea
                      value={xVersion}
                      onChange={(e) => setXVersion(e.target.value)}
                      placeholder="A concise version will be generated here..."
                      className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      rows={4}
                      maxLength={280}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-xs ${xVersion.length > 280 ? 'text-red-500' : xVersion.length > 250 ? 'text-yellow-500' : 'text-purple-500'}`}>
                        {xVersion.length}/280 characters
                      </span>
                      <button
                        onClick={handleGenerateXVersion}
                        disabled={isGeneratingXVersion}
                        className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-1"
                      >
                        {isGeneratingXVersion ? (
                          <>
                            <Loader className="w-3 h-3" />
                            Generating...
                          </>
                        ) : (
                          'Generate Concise Version'
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-purple-200">
                    <button
                      onClick={() => navigator.clipboard.writeText(xVersion)}
                      disabled={!xVersion}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 text-sm"
                    >
                      📋 Copy to Clipboard
                    </button>
                    <button
                      onClick={() => window.open('https://x.com/compose/tweet', '_blank')}
                      className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 text-sm"
                    >
                      𝕏 Open X.com
                    </button>
                    <button
                      onClick={() => setIsPreparingForX(false)}
                      className="px-4 py-2 border border-purple-300 text-purple-700 rounded hover:bg-purple-50 text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

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
