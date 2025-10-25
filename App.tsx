import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SettingsPanel from './components/SettingsPanel';
import ContentGenerator from './components/ContentGenerator';
import DraftEditor from './components/DraftEditor';
import DashboardSection from './components/DashboardSection';
import GamificationStats from './components/GamificationStats';
import PreferredTimePrompt from './components/PreferredTimePrompt';
import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';
import Loader from './components/Loader';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import OAuthCallback from './components/OAuthCallback';
import LinkedInSimple from './components/LinkedInSimple';
import type { UserSettings, DraftPost, PublishedPost, ScheduledPost, User, AuthState } from './types';
import * as db from './services/dbService';
import { postToLinkedIn } from './services/linkedInService';
import { getScheduledPosts, createScheduledPost, updateScheduledPost, cancelScheduledPost } from './services/schedulingService';
import authService from './services/authService';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [view, setView] = useState<'dashboard' | 'settings' | 'profile'>('dashboard');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [published, setPublished] = useState<PublishedPost[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledPost[]>([]);
  const [editingDraft, setEditingDraft] = useState<DraftPost | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showContentGenerator, setShowContentGenerator] = useState(false);

  useEffect(() => {
    // Check for persisted authentication on initial load
    const initializeAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          // Try to get user profile to validate token
          const userProfile = await db.getUserProfile();
          setAuthState({
            isAuthenticated: true,
            user: userProfile,
            isLoading: false,
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // Token might be expired or invalid
        await authService.logout();
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    // Handle URL parameters for LinkedIn OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const connectedParam = urlParams.get('connected');
    
    if (viewParam === 'settings') {
      setView('settings');
    }
    
    if (connectedParam === 'true') {
      // Show success message and clear URL parameters
      setTimeout(() => {
        alert('LinkedIn account connected successfully!');
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 500);
    }
    
    // Clear URL parameters after processing
    if (urlParams.has('view') || urlParams.has('connected')) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  useEffect(() => {
    // Load data only when authenticated
    if (authState.isAuthenticated) {
      const loadData = async () => {
        setIsLoadingData(true);
        try {
          console.log('Loading initial data...');
          const initialData = await db.initializeDB();
          console.log('Initial data loaded:', initialData);
          setSettings(initialData.settings);
          setDrafts(initialData.drafts);
          setPublished(initialData.published);
          
          // Load scheduled posts
          const scheduledPosts = await getScheduledPosts();
          setScheduled(scheduledPosts);
        } catch (error) {
          console.error("Failed to load data from the database service.", error);
          // If data loading fails due to auth, logout user
          if (error.message?.includes('Session expired') || error.message?.includes('token')) {
            handleLogout();
          }
        } finally {
          setIsLoadingData(false);
        }
      };
      loadData();
    }
  }, [authState.isAuthenticated]);

  // Check for OAuth callback on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('accessToken');
    const refreshToken = urlParams.get('refreshToken');
    const error = urlParams.get('message');

    if (error) {
      console.error('OAuth error:', error);
      alert(`Authentication failed: ${error}`);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (accessToken && refreshToken) {
      // Handle OAuth success
      handleOAuthSuccess(accessToken, refreshToken);
    }
  }, []);

  const handleOAuthSuccess = async (accessToken: string, refreshToken: string) => {
    try {
      // Store tokens
      authService.setTokens(accessToken, refreshToken);
      
      // Get user profile
      const userProfile = await db.getUserProfile();
      
      setAuthState({
        isAuthenticated: true,
        user: userProfile,
        isLoading: false,
      });

      // Load all user data (settings, drafts, etc.)
      try {
        const initialData = await db.initializeDB();
        setSettings(initialData.settings);
        setDrafts(initialData.drafts);
        setPublished(initialData.published);
        
        // Load scheduled posts
        const scheduledPosts = await getScheduledPosts();
        setScheduled(scheduledPosts);
      } catch (dataError) {
        console.error('Failed to load user data after OAuth:', dataError);
        // Don't fail the OAuth process if data loading fails
      }

      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      alert('Successfully connected to LinkedIn!');
    } catch (error) {
      console.error('OAuth success handling failed:', error);
      console.error('Error details:', error);
      alert(`Authentication succeeded but failed to load user data: ${error.message}`);
      
      // Clear URL parameters even on error
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleOAuthError = (error: string) => {
    console.error('OAuth error:', error);
    alert(`Authentication failed: ${error}`);
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };
  
  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      setAuthState({
        isAuthenticated: true,
        user: response.user,
        isLoading: false,
      });
    } catch (error) {
      throw error; // Re-throw to be handled by the login component
    }
  };

  const handleRegister = async (email: string, password: string) => {
    try {
      const response = await authService.register({ email, password });
      setAuthState({
        isAuthenticated: true,
        user: response.user,
        isLoading: false,
      });
    } catch (error) {
      throw error; // Re-throw to be handled by the register component
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
      // Reset state on logout
      setView('dashboard');
      setSettings(null);
      setDrafts([]);
      setPublished([]);
      setScheduled([]);
      setEditingDraft(null);
    }
  };

  const loadUserData = async () => {
    try {
      // Reload user profile to get updated LinkedIn connection status
      const userProfile = await db.getUserProfile();
      setAuthState(prev => ({
        ...prev,
        user: userProfile
      }));
    } catch (error) {
      console.error('Failed to reload user data:', error);
    }
  };

  const handleNavigate = (newView: 'profile' | 'settings') => {
    setEditingDraft(null);
    setView(newView);
  };
  
  const handleBackToDashboard = () => {
    setEditingDraft(null);
    setView('dashboard');
  };

  const handleSaveSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    await db.saveUserSettings(newSettings);
    setView('dashboard');
  };
  
  const handleProfilePictureChange = async (url: string) => {
    if (settings) {
      const newSettings = { ...settings, profilePictureUrl: url };
      setSettings(newSettings);
      await db.saveUserSettings(newSettings);
    }
  };

  const handleAddDraft = async (newDraft: DraftPost) => {
    try {
      const savedDraft = await db.saveDraft(newDraft);
      const newDrafts = [savedDraft, ...drafts];
      setDrafts(newDrafts);
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw error;
    }
  };
  
  const handleSelectDraft = (draftToEdit: DraftPost) => {
    setEditingDraft(draftToEdit);
  };

  const handleUpdateDraft = async (updatedDraft: DraftPost) => {
    try {
      const savedDraft = await db.saveDraft(updatedDraft);
      const newDrafts = drafts.map(d => d.id === updatedDraft.id ? savedDraft : d);
      setDrafts(newDrafts);
      if (editingDraft?.id === updatedDraft.id) {
        setEditingDraft(savedDraft);
      }
    } catch (error) {
      console.error('Failed to update draft:', error);
      throw error;
    }
  };

  const handlePublish = async (draftToPublish: DraftPost) => {
    // Set loading state for this specific draft
    const setDraftPublishingState = (id: string, isPublishing: boolean) => {
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, isPublishing } : d));
      if (editingDraft?.id === id) {
        setEditingDraft(prev => prev ? { ...prev, isPublishing } : null);
      }
    };
    
    setDraftPublishingState(draftToPublish.id, true);

    try {
      // First publish to LinkedIn
      await postToLinkedIn({
        text: `${draftToPublish.title}\n\n${draftToPublish.text}`,
        base64Image: draftToPublish.imageUrl,
      });

      // Then move from drafts to published in our database
      const publishedPost = await db.publishPost(draftToPublish);
      
      const newPublished = [publishedPost, ...published];
      const newDrafts = drafts.filter(d => d.id !== draftToPublish.id);

      setPublished(newPublished);
      setDrafts(newDrafts);
      setEditingDraft(null);

      alert(`Post "${draftToPublish.title}" published successfully to LinkedIn!`);

    } catch (error) {
      console.error("Failed to publish to LinkedIn:", error);
      alert(`Failed to publish post: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Reset loading state on failure
      setDraftPublishingState(draftToPublish.id, false);
    }
  };

  const handleSchedule = async (draftToSchedule: DraftPost) => {
    // For now, we'll schedule for 1 hour from now as a placeholder
    // In a real implementation, this would open a date/time picker
    const scheduledFor = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    
    try {
      const scheduledPost = await createScheduledPost(
        draftToSchedule.title,
        draftToSchedule.text,
        draftToSchedule.imageUrl,
        scheduledFor
      );
      
      const newScheduled = [scheduledPost, ...scheduled];
      setScheduled(newScheduled);
      
      alert(`Post "${draftToSchedule.title}" scheduled for ${new Date(scheduledFor).toLocaleString()}!`);
    } catch (error) {
      console.error("Failed to schedule post:", error);
      alert(`Failed to schedule post: ${error.message}`);
    }
  };

  const handleReschedulePost = async (post: ScheduledPost) => {
    // For now, reschedule for 1 hour later as a placeholder
    const newScheduledFor = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    
    try {
      const updatedPost = await updateScheduledPost(post.id, { scheduledFor: newScheduledFor });
      const newScheduled = scheduled.map(p => p.id === post.id ? updatedPost : p);
      setScheduled(newScheduled);
      
      alert(`Post rescheduled for ${new Date(newScheduledFor).toLocaleString()}!`);
    } catch (error) {
      console.error("Failed to reschedule post:", error);
      alert(`Failed to reschedule post: ${error.message}`);
    }
  };

  const handleCancelPost = async (post: ScheduledPost) => {
    if (!confirm(`Are you sure you want to cancel the scheduled post "${post.title}"?`)) {
      return;
    }
    
    try {
      await cancelScheduledPost(post.id);
      const newScheduled = scheduled.filter(p => p.id !== post.id);
      setScheduled(newScheduled);
      
      alert(`Scheduled post "${post.title}" has been cancelled.`);
    } catch (error) {
      console.error("Failed to cancel scheduled post:", error);
      alert(`Failed to cancel post: ${error.message}`);
    }
  };

  const handleDeleteDraft = async (draftToDelete: DraftPost) => {
    try {
      await db.deleteDraft(draftToDelete.id);
      const newDrafts = drafts.filter(d => d.id !== draftToDelete.id);
      setDrafts(newDrafts);
      
      // If we're currently editing this draft, close the editor
      if (editingDraft?.id === draftToDelete.id) {
        setEditingDraft(null);
      }
    } catch (error) {
      console.error('Failed to delete draft:', error);
      alert(`Failed to delete draft: ${error.message}`);
    }
  };

  const handleOpenContentGenerator = () => {
    setShowContentGenerator(true);
  };

  const handleContentGeneratorOpened = () => {
    setShowContentGenerator(false);
  };

  const handleCloseEditor = () => {
    setEditingDraft(null);
  };

  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200">
        <Loader className="h-10 w-10 text-brand-primary" />
      </div>
    );
  }
  
  if (!authState.isAuthenticated) {
    if (authView === 'register') {
      return (
        <RegisterPage 
          onRegister={handleRegister} 
          onSwitchToLogin={() => setAuthView('login')} 
        />
      );
    }
    return (
      <LoginPage 
        onLogin={handleLogin} 
        onSwitchToRegister={() => setAuthView('register')} 
      />
    );
  }
  
  if (isLoadingData) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-base-200">
        <Loader className="h-10 w-10 text-brand-primary" />
        <p className="ml-4">Loading your dashboard...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200">
        <p className="text-content">Error: Could not load user settings.</p>
      </div>
    );
  }

  const renderDashboard = () => {
    if (!settings) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-base-200">
          <Loader className="h-10 w-10 text-brand-primary" />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PreferredTimePrompt 
            settings={settings} 
            onCreatePost={handleOpenContentGenerator}
          />
          <ContentGenerator 
              settings={settings} 
              onNewDraft={handleAddDraft} 
              onPublish={handlePublish}
              onSchedule={handleSchedule}
              forceOpen={showContentGenerator}
              onForceOpenHandled={handleContentGeneratorOpened}
          />
          <DashboardSection 
              title="Recent Drafts" 
              posts={drafts} 
              onSelectPost={handleSelectDraft}
              onDeletePost={handleDeleteDraft}
          />
        </div>
        <div className="space-y-6">
          <SettingsPanel settings={settings} />
          <LinkedInSimple />
          <GamificationStats />
          <DashboardSection
            title="Scheduled Posts"
            posts={scheduled}
            onReschedulePost={handleReschedulePost}
            onCancelPost={handleCancelPost}
          />
          <DashboardSection title="Published Posts" posts={published} />
        </div>
      </div>
    );
  };
  
  const renderContent = () => {
    switch(view) {
      case 'settings':
        console.log('Rendering settings page, settings:', settings);
        if (!settings) {
          console.log('Settings is null, showing loader');
          return (
            <div className="flex items-center justify-center min-h-screen bg-base-200">
              <Loader className="h-10 w-10 text-brand-primary" />
            </div>
          );
        }
        return <SettingsPage 
          settings={settings} 
          user={authState.user}
          onChange={setSettings} 
          onSave={handleSaveSettings} 
          onBack={handleBackToDashboard}
          onUserUpdate={loadUserData}
        />;
      case 'profile':
        if (!settings) {
          return (
            <div className="flex items-center justify-center min-h-screen bg-base-200">
              <Loader className="h-10 w-10 text-brand-primary" />
            </div>
          );
        }
        return <ProfilePage settings={settings} onProfilePictureChange={handleProfilePictureChange} onBack={handleBackToDashboard} />;
      case 'dashboard':
      default:
        return (
          <>
            <main className="p-4 sm:p-6 lg:p-8">
              {renderDashboard()}
            </main>
            {editingDraft && (
               <DraftEditor 
                  draft={editingDraft} 
                  settings={settings}
                  onUpdate={handleUpdateDraft}
                  onPublish={handlePublish}
                  onClose={handleCloseEditor}
              />
            )}
          </>
        );
    }
  }

  return (
    <div className="bg-base-200 min-h-screen text-content font-sans">
      <Header 
        profilePictureUrl={authState.user?.profilePictureUrl || settings?.profilePictureUrl} 
        onNavigate={handleNavigate} 
        onLogout={handleLogout} 
      />
      {renderContent()}
    </div>
  );
};

export default App;
