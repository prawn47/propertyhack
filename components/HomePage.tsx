import React, { useState, useRef } from 'react';
import { generatePostIdeas, generateDraftPost, generatePostImage, enhanceImage, generateConciseForX } from '../services/geminiService';
import type { UserSettings, DraftPost, NewsArticle } from '../types';
import Loader from './Loader';
import SparklesIcon from './icons/SparklesIcon';
import WandIcon from './icons/WandIcon';
import UploadIcon from './icons/UploadIcon';
import NewsCarousel from './NewsCarousel';

interface HomePageProps {
  settings: UserSettings;
  onAddDraft: (draft: DraftPost) => Promise<void>;
  onPublish: (draft: DraftPost) => Promise<void>;
  onSchedule: (draft: DraftPost, scheduledFor?: string) => Promise<void>;
  onNavigateToSettings: () => void;
}

type WizardStep = 'topic' | 'ideas' | 'draft';

const HomePage: React.FC<HomePageProps> = ({ settings, onAddDraft, onPublish, onSchedule, onNavigateToSettings }) => {
  const [step, setStep] = useState<WizardStep>('topic');
  const [topic, setTopic] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [generatedDraft, setGeneratedDraft] = useState<Omit<DraftPost, 'id'>>({ title: '', text: '', imageUrl: undefined });
  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancementPrompt, setEnhancementPrompt] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [scheduledForInput, setScheduledForInput] = useState<string>(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate dynamic placeholder based on user settings
  const placeholderText = () => {
    const position = settings.position || 'professional';
    const industry = settings.industry || 'your industry';
    return `e.g., The future of AI in ${industry}...`;
  };

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
      // Include article context if selected
      let enhancedIdea = idea;
      if (selectedArticle) {
        enhancedIdea = `${idea}\n\nContext: Commenting on article "${selectedArticle.title}" from ${selectedArticle.source}: ${selectedArticle.summary}\nArticle URL: ${selectedArticle.url}`;
      }
      const draftContent = await generateDraftPost(enhancedIdea, settings);
      setGeneratedDraft(draftContent);
    } catch (err) {
      setError('Failed to generate draft. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommentOnArticle = (article: NewsArticle) => {
    setSelectedArticle(article);
    setTopic(`Write a professional commentary on this article: ${article.title}`);
    setStep('topic');
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
      setGeneratedDraft(prev => ({ ...prev, imageUrl }));
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
      setGeneratedDraft(prev => ({ ...prev, imageUrl: newImageUrl }));
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
    onAddDraft(newDraft);
    resetWizard();
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    const postToPublish: DraftPost = {
      id: new Date().toISOString(),
      ...generatedDraft
    };
    
    try {
      await onPublish(postToPublish);
      setIsPublishing(false);
      resetWizard();
    } catch (error) {
      setIsPublishing(false);
      
      // Check if it's an authentication error (draft already saved in App.tsx)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Not authenticated') || errorMessage.includes('401') || errorMessage.includes('LinkedIn')) {
        const shouldConnect = confirm(
          'Your LinkedIn account is not connected. Your post has been saved to Drafts.\n\n' +
          'Would you like to connect your LinkedIn account now?'
        );
        
        if (shouldConnect) {
          onNavigateToSettings();
        }
      }
      
      resetWizard();
    }
  };

  const handleSchedule = () => {
    setIsScheduling(true);
  };

  const handleConfirmSchedule = () => {
    const draftToSchedule: DraftPost = {
      id: new Date().toISOString(),
      ...generatedDraft
    };
    const selected = new Date(scheduledForInput);
    const iso = isNaN(selected.getTime()) ? undefined : selected.toISOString();
    onSchedule(draftToSchedule, iso);
    resetWizard();
  };

  const resetWizard = () => {
    setStep('topic');
    setTopic('');
    setIdeas([]);
    setGeneratedDraft({ title: '', text: '', imageUrl: undefined });
    setError(null);
    setIsScheduling(false);
    setSelectedArticle(null);
  };

  const renderStepContent = () => {
    if (step === 'topic') {
      return (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-content mb-1">💭 What's on your mind?</h2>
            <p className="text-sm text-content-secondary">Enter a topic or idea to generate post concepts</p>
          </div>
          {selectedArticle && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs font-semibold text-blue-700 mb-1">📰 Commenting on article:</p>
              <p className="text-sm text-blue-900 font-medium">{selectedArticle.title}</p>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-xs text-blue-600 hover:text-blue-800 mt-1"
              >
                ✕ Clear article
              </button>
            </div>
          )}
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={placeholderText()}
            className="w-full px-4 py-3 bg-base-100 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none"
            rows={6}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleGenerateIdeas}
              disabled={isLoading || !topic.trim()}
              className="flex items-center px-6 py-3 bg-brand-primary text-white rounded-md hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Generate Ideas
                </>
              )}
            </button>
          </div>
        </div>
      );
    }

    if (step === 'ideas') {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-content">Choose a concept</h2>
            <button
              onClick={() => setStep('topic')}
              className="text-sm text-content-secondary hover:text-content"
            >
              ← Back
            </button>
          </div>
          <div className="space-y-3">
            {ideas.map((idea, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectIdea(idea)}
                className="w-full p-4 text-left bg-base-100 border border-base-300 rounded-lg hover:border-brand-primary hover:bg-base-200 transition-all"
              >
                <p className="text-content">{idea}</p>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (step === 'draft') {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-content">Your post</h2>
            <button
              onClick={() => setStep('ideas')}
              className="text-sm text-content-secondary hover:text-content"
            >
              ← Back to ideas
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-brand-primary" />
              <p className="ml-3 text-content-secondary">Generating your post...</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-content mb-2">Title</label>
                <input
                  type="text"
                  value={generatedDraft.title}
                  onChange={(e) => handleDraftChange('title', e.target.value)}
                  className="w-full px-4 py-2 bg-base-100 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-content mb-2">Content</label>
                <textarea
                  value={generatedDraft.text}
                  onChange={(e) => handleDraftChange('text', e.target.value)}
                  className="w-full px-4 py-3 bg-base-100 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  rows={12}
                />
              </div>

              {/* Image Section */}
              <div>
                <label className="block text-sm font-medium text-content mb-2">Image (optional)</label>
                {generatedDraft.imageUrl ? (
                  <div className="space-y-3">
                    <img src={generatedDraft.imageUrl} alt="Post" className="w-full max-h-64 object-cover rounded-lg" />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={enhancementPrompt}
                        onChange={(e) => setEnhancementPrompt(e.target.value)}
                        placeholder="Describe how to enhance the image..."
                        className="flex-1 px-4 py-2 bg-base-100 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                      <button
                        onClick={handleEnhanceImage}
                        disabled={isImageLoading || !enhancementPrompt}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isImageLoading ? <Loader className="w-5 h-5" /> : <WandIcon className="w-5 h-5" />}
                      </button>
                    </div>
                    <button
                      onClick={() => setGeneratedDraft(prev => ({ ...prev, imageUrl: undefined }))}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove image
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerateImage}
                      disabled={isImageLoading}
                      className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isImageLoading ? (
                        <>
                          <Loader className="w-5 h-5 mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="w-5 h-5 mr-2" />
                          Generate Image
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleUploadClick}
                      className="flex items-center px-4 py-2 border border-base-300 text-content rounded-md hover:bg-base-200"
                    >
                      <UploadIcon className="w-5 h-5 mr-2" />
                      Upload Image
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              {/* Action Buttons */}
              {!isScheduling ? (
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleAddToDrafts}
                    className="px-6 py-3 border border-base-300 text-content rounded-md hover:bg-base-200"
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={handleSchedule}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Schedule
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="px-6 py-3 bg-brand-primary text-white rounded-md hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPublishing ? 'Publishing...' : 'Publish Now'}
                  </button>
                </div>
              ) : (
                <div className="bg-base-200 p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold text-content">Schedule Post</h3>
                  <input
                    type="datetime-local"
                    value={scheduledForInput}
                    onChange={(e) => setScheduledForInput(e.target.value)}
                    className="w-full px-4 py-2 bg-base-100 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsScheduling(false)}
                      className="px-4 py-2 border border-base-300 text-content rounded-md hover:bg-base-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmSchedule}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Confirm Schedule
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* What's On Your Mind - Compact */}
      <div className="bg-base-100 p-6 rounded-lg shadow-md">
        {renderStepContent()}
      </div>

      {/* News Carousel - Only show on topic step */}
      {step === 'topic' && (
        <NewsCarousel onCommentOnArticle={handleCommentOnArticle} />
      )}
    </div>
  );
};

export default HomePage;
