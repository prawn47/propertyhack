// Fix: Implemented the PostCreationWizard component which was previously missing.
import React, { useState, useRef } from 'react';
import type { UserSettings, DraftPost } from '../types';
import { generatePostIdeas, generateDraftPost, generatePostImage, enhanceImage, generateConciseForX } from '../services/geminiService';
import Loader from './Loader';
import SparklesIcon from './icons/SparklesIcon';
import WandIcon from './icons/WandIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import PostIcon from './icons/PostIcon';
import UploadIcon from './icons/UploadIcon';

interface PostCreationWizardProps {
  settings: UserSettings;
  onAddToDrafts: (draft: DraftPost) => void;
  onPublish: (draft: DraftPost) => void;
  onSchedule: (draft: DraftPost, scheduledFor?: string) => void;
  onClose: () => void;
}

type WizardStep = 'topic' | 'ideas' | 'draft';

const PostCreationWizard: React.FC<PostCreationWizardProps> = ({ settings, onAddToDrafts, onPublish, onSchedule, onClose }) => {
  const [step, setStep] = useState<WizardStep>('topic');
  const [topic, setTopic] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [generatedDraft, setGeneratedDraft] = useState<Omit<DraftPost, 'id'>>({ title: '', text: '', imageUrl: undefined });
  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancementPrompt, setEnhancementPrompt] = useState('');
  const [isPreparingForX, setIsPreparingForX] = useState(false);
  const [xVersion, setXVersion] = useState('');
  const [isGeneratingXVersion, setIsGeneratingXVersion] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledForInput, setScheduledForInput] = useState<string>(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`; // for input type=datetime-local
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateIdeas = async () => {
    if (!topic) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await generatePostIdeas(topic, settings);
      setIdeas(result);
      setStep('ideas');
    } catch (err) {
      setError('Failed to generate ideas. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectIdea = async (idea: string) => {
    setIsLoading(true);
    setError(null);
    setGeneratedDraft({ title: '', text: '', imageUrl: undefined });
    setStep('draft');
    try {
      const draftContent = await generateDraftPost(idea, settings);
      setGeneratedDraft(draftContent);
    } catch (err) {
      setError('Failed to generate draft. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDraftChange = (field: 'title' | 'text', value: string) => {
    setGeneratedDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateImage = async () => {
    if (!generatedDraft.text) return;
    setIsImageLoading(true);
    setError(null);
    try {
        const imageUrl = await generatePostImage(generatedDraft.text);
        setGeneratedDraft(prev => ({...prev, imageUrl}));
    } catch (err) {
        setError('Failed to generate image. Please try again.');
    } finally {
        setIsImageLoading(false);
    }
  };

  const handleEnhanceImage = async () => {
    if (!generatedDraft.imageUrl || !enhancementPrompt) return;
    setIsImageLoading(true);
    setError(null);
    try {
        const newImageUrl = await enhanceImage(generatedDraft.imageUrl, enhancementPrompt);
        setGeneratedDraft(prev => ({...prev, imageUrl: newImageUrl}));
        setEnhancementPrompt('');
    } catch (err) {
        setError('Failed to enhance image. Please try again.');
    } finally {
        setIsImageLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGeneratedDraft(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };


  const handleAddToDrafts = () => {
    const newDraft: DraftPost = {
      id: new Date().toISOString(),
      ...generatedDraft
    };
    onAddToDrafts(newDraft);
    onClose();
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    const postToPublish: DraftPost = {
      id: new Date().toISOString(),
      ...generatedDraft
    };
    // The onPublish function from App.tsx now handles all logic including errors
    await onPublish(postToPublish);
    setIsPublishing(false);
    onClose();
  };

  const handleSchedule = () => {
    // Open scheduling controls instead of immediate schedule
    setIsScheduling(true);
  };

  const handleConfirmSchedule = () => {
    const draftToSchedule: DraftPost = {
      id: new Date().toISOString(),
      ...generatedDraft
    };
    // Convert datetime-local value to ISO string in local timezone
    const selected = new Date(scheduledForInput);
    const iso = isNaN(selected.getTime()) ? undefined : selected.toISOString();
    onSchedule(draftToSchedule, iso);
    onClose();
  };

  const handlePrepareForX = async () => {
    setIsPreparingForX(true);
    // Auto-generate the initial X version
    await handleGenerateXVersion();
  };

  const handleGenerateXVersion = async () => {
    if (!generatedDraft.title || !generatedDraft.text) return;
    
    setIsGeneratingXVersion(true);
    try {
      const conciseVersion = await generateConciseForX(
        generatedDraft.title,
        generatedDraft.text,
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

  const resetWizard = () => {
    setStep('topic');
    setTopic('');
    setIdeas([]);
    setGeneratedDraft({ title: '', text: '', imageUrl: undefined });
    setError(null);
  };
  
  const renderTopicStep = () => (
    <div>
        <h3 className="text-lg font-semibold text-content mb-2">What's on your mind?</h3>
        <p className="text-sm text-content-secondary mb-4">Enter a topic, a question, or a simple idea, and the AI will generate post concepts for you.</p>
        <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., The future of AI in product management..."
            className="input-field"
            rows={4}
        />
        <div className="mt-4 flex justify-end">
            <button
                onClick={handleGenerateIdeas}
                disabled={!topic || isLoading}
                className="btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? <Loader /> : <SparklesIcon className="w-5 h-5 mr-2" />}
                Generate Ideas
            </button>
        </div>
    </div>
  );

  const renderIdeasStep = () => (
    <div>
      <h3 className="text-lg font-semibold text-content mb-2">Choose an Idea</h3>
      <p className="text-sm text-content-secondary mb-4">Select one of the AI-generated concepts to develop it into a full post.</p>
      <div className="space-y-3">
        {ideas.map((idea, index) => (
          <button
            key={index}
            onClick={() => handleSelectIdea(idea)}
            className="w-full text-left p-5 bg-gradient-to-br from-base-100 to-base-200 border border-base-300 rounded-xl hover:border-brand-primary hover:shadow-medium transition-all duration-300 flex items-center space-x-3 group"
          >
             <WandIcon className="w-5 h-5 text-brand-primary flex-shrink-0 group-hover:scale-110 transition-transform" />
            <span className="flex-grow text-content group-hover:text-brand-primary transition-colors">{idea}</span>
          </button>
        ))}
      </div>
       <div className="mt-6 flex justify-between items-center">
            <button onClick={resetWizard} className="text-sm font-semibold text-brand-primary hover:text-brand-secondary">
                &larr; Start Over
            </button>
        </div>
    </div>
  );

  const renderDraftStep = () => (
    <div>
       <h3 className="text-lg font-semibold text-content mb-2">Review & Refine Your Draft</h3>
       <p className="text-sm text-content-secondary mb-4">Make any final adjustments to the title, text, and image before saving or publishing.</p>
       {isLoading && !generatedDraft.title ? (
            <div className="flex flex-col items-center justify-center h-64 bg-base-200 rounded-lg">
                <Loader className="h-8 w-8 text-brand-primary" />
                <p className="mt-4 text-content-secondary">Generating your masterpiece...</p>
            </div>
       ) : (
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            <div>
              <label htmlFor="draftTitle" className="block text-sm font-medium text-content-secondary mb-2">Title</label>
              <input type="text" id="draftTitle" value={generatedDraft.title} onChange={(e) => handleDraftChange('title', e.target.value)} className="input-field font-semibold" />
            </div>
            <div>
              <label htmlFor="draftText" className="block text-sm font-medium text-content-secondary mb-2">Text</label>
              <textarea id="draftText" value={generatedDraft.text} onChange={(e) => handleDraftChange('text', e.target.value)} rows={8} className="input-field" />
            </div>
            
            {/* Image Section */}
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-2">Image</label>
              {isImageLoading ? (
                 <div className="flex items-center justify-center h-48 bg-gradient-to-br from-base-200 to-base-300 rounded-xl shadow-soft"><Loader className="h-6 w-6 text-brand-primary" /></div>
              ) : generatedDraft.imageUrl ? (
                <div className="space-y-3">
                  <img src={generatedDraft.imageUrl} alt="Post visual" className="w-full h-auto max-h-80 object-cover rounded-xl shadow-medium" />
                  <div className="flex items-center gap-2">
                      <input type="text" value={enhancementPrompt} onChange={(e) => setEnhancementPrompt(e.target.value)} placeholder="e.g., make it more futuristic" className="flex-grow px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                      <button onClick={handleEnhanceImage} disabled={!enhancementPrompt || isImageLoading} className="flex-shrink-0 flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none disabled:bg-gray-400">
                          <WandIcon className="w-4 h-4 mr-2" /> Enhance
                      </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                      <button onClick={handleGenerateImage} className="text-xs btn btn-sm btn-outline">Regenerate</button>
                      <button onClick={handleUploadClick} className="text-xs btn btn-sm btn-outline">Replace Image</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button onClick={handleGenerateImage} className="w-1/2 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-base-300 rounded-lg hover:border-brand-primary">
                    <SparklesIcon className="w-5 h-5 text-brand-primary" /> Generate with AI
                  </button>
                  <button onClick={handleUploadClick} className="w-1/2 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-base-300 rounded-lg hover:border-brand-primary">
                    <UploadIcon className="w-5 h-5 text-brand-primary" /> Upload Your Own
                  </button>
                </div>
              )}
               <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
        </div>
       )}

       {/* X.com Preparation Section */}
       {isPreparingForX && (
         <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
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

       {!isLoading && generatedDraft.title && (
           <div className="mt-6 pt-4 border-t border-base-300 flex flex-col sm:flex-row justify-end gap-3">
               <button 
                onClick={handleAddToDrafts}
                disabled={isPublishing}
                className="flex items-center justify-center px-4 py-2 border border-base-300 text-sm font-medium rounded-md shadow-sm text-content bg-base-100 hover:bg-base-200 focus:outline-none disabled:bg-gray-400"
               >
                   <ClipboardListIcon className="w-5 h-5 mr-2" />
                   Add to Drafts
               </button>
              <button 
               onClick={handleSchedule}
                disabled={isPublishing}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:bg-gray-400"
               >
                   <ClipboardListIcon className="w-5 h-5 mr-2" />
                   Schedule
               </button>
               <button 
                onClick={handlePrepareForX}
                disabled={isPublishing}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none disabled:bg-gray-400"
               >
                   <span className="text-lg mr-2">𝕏</span>
                   Prepare for X
               </button>
               <button 
                onClick={handlePublish}
                disabled={isPublishing}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:bg-gray-400"
               >
                   {isPublishing ? (
                       <>
                           <Loader className="w-5 h-5 mr-2"/>
                           Publishing...
                       </>
                   ) : (
                       <>
                           <PostIcon className="w-5 h-5 mr-2" />
                           Publish Now
                       </>
                   )}
               </button>
           </div>
       )}
      {isScheduling && (
        <div className="mt-4 p-4 border border-base-300 rounded-lg bg-base-100">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <label className="text-sm text-content-secondary" htmlFor="scheduleAt">Schedule for</label>
            <input
              id="scheduleAt"
              type="datetime-local"
              value={scheduledForInput}
              onChange={(e) => setScheduledForInput(e.target.value)}
              className="px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
            />
            <div className="flex gap-2 ml-auto">
              <button
                onClick={handleConfirmSchedule}
                className="px-4 py-2 text-sm rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Confirm
              </button>
              <button
                onClick={() => setIsScheduling(false)}
                className="px-4 py-2 text-sm rounded-md border border-base-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
       <div className="mt-4 flex justify-between items-center">
            <button onClick={() => setStep('ideas')} className="text-sm font-semibold text-brand-primary hover:text-brand-secondary disabled:text-gray-400" disabled={isLoading}>
                &larr; Back to Ideas
            </button>
        </div>
    </div>
  );

  const renderStepContent = () => {
    switch(step) {
      case 'topic':
        return renderTopicStep();
      case 'ideas':
        return renderIdeasStep();
      case 'draft':
        return renderDraftStep();
      default:
        return <div>Invalid step</div>;
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-base-100 p-8 rounded-2xl shadow-strong border border-base-300 w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-content flex items-center">
                    <SparklesIcon className="w-6 h-6 mr-3 text-brand-primary" />
                    New Post Generator
                </h2>
                <button onClick={onClose} className="text-sm font-semibold text-content-secondary hover:text-content">
                    &times; Close
                </button>
            </div>
            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert"><p>{error}</p></div>}
            {renderStepContent()}
        </div>
    </div>
  );
};

export default PostCreationWizard;
