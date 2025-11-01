import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DraftEditor from './components/DraftEditor';
import HomePage from './components/HomePage';
import DraftsPage from './components/DraftsPage';
import ScheduledPage from './components/ScheduledPage';
import PublishedPage from './components/PublishedPage';
import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';
import Loader from './components/Loader';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import OAuthCallback from './components/OAuthCallback';
import { PromptManagementPage } from './components/PromptManagementPage';
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
  const [view, setView] = useState<'dashboard' | 'settings' | 'profile' | 'prompts'>('dashboard');
  const [currentPage, setCurrentPage] = useState<'home' | 'drafts' | 'scheduled' | 'published'>('home');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [published, setPublished] = useState<PublishedPost[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledPost[]>([]);
  const [editingDraft, setEditingDraft] = useState<DraftPost | null>(null);
  const [editingScheduledId, setEditingScheduledId] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [rescheduleTarget, setRescheduleTarget] = useState<ScheduledPost | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState<string>("");

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

  const handleNavigate = (newView: 'profile' | 'settings' | 'prompts') => {
    setEditingDraft(null);
    setView(newView);
  };
  
  const handleBackToDashboard = () => {
    setEditingDraft(null);
    setView('dashboard');
    setCurrentPage('home');
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
    setEditingScheduledId(null);
  };

  const handleSelectScheduled = (post: ScheduledPost) => {
    const draftLike: DraftPost = {
      id: post.id,
      title: post.title,
      text: post.text,
      imageUrl: post.imageUrl,
      isPublishing: false,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
    setEditingDraft(draftLike);
    setEditingScheduledId(post.id);
  };

  const handleUpdateDraft = async (updatedDraft: DraftPost) => {
    try {
      if (editingScheduledId) {
        const updated = await updateScheduledPost(editingScheduledId, {
          title: updatedDraft.title,
          text: updatedDraft.text,
          imageUrl: updatedDraft.imageUrl,
        });
        const newScheduled = scheduled.map(p => p.id === editingScheduledId ? updated : p);
        setScheduled(newScheduled);
        setEditingDraft(prev => prev ? { ...prev, title: updated.title, text: updated.text, imageUrl: updated.imageUrl || undefined } : prev);
      } else {
        const savedDraft = await db.saveDraft(updatedDraft);
        const newDrafts = drafts.map(d => d.id === updatedDraft.id ? savedDraft : d);
        setDrafts(newDrafts);
        if (editingDraft?.id === updatedDraft.id) {
          setEditingDraft(savedDraft);
        }
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
    
    if (editingScheduledId) {
      alert('This is a scheduled post. To publish now, cancel scheduling first or wait for the scheduled time.');
      return;
    }
    setDraftPublishingState(draftToPublish.id, true);

    try {
      // Ensure the draft exists server-side and has a server-assigned ID before publishing
      const isServerAssignedId = draftToPublish.id && !draftToPublish.id.includes('T') && !draftToPublish.id.includes(':');
      let persistedDraft = draftToPublish;
      if (!isServerAssignedId) {
        const savedDraft = await db.saveDraft(draftToPublish);
        persistedDraft = savedDraft;
        // Reflect any updated ID/content locally
        setDrafts(prev => prev.map(d => d.id === draftToPublish.id ? savedDraft : d));
        if (editingDraft?.id === draftToPublish.id) {
          setEditingDraft(savedDraft);
        }
      }

      // First publish to LinkedIn - this can fail due to auth issues
      await postToLinkedIn({
        text: `${persistedDraft.title}\n\n${persistedDraft.text}`,
        base64Image: persistedDraft.imageUrl,
      });

      // Only move from drafts to published in our database if LinkedIn post succeeded
      const publishedPost = await db.publishPost(persistedDraft);
      
      const newPublished = [publishedPost, ...published];
      const newDrafts = drafts.filter(d => d.id !== persistedDraft.id);

      setPublished(newPublished);
      setDrafts(newDrafts);
      setEditingDraft(null);

      alert(`Post "${draftToPublish.title}" published successfully to LinkedIn!`);

    } catch (error) {
      console.error("Failed to publish to LinkedIn:", error);
      
      // Reset loading state on failure - draft remains in drafts list
      setDraftPublishingState(draftToPublish.id, false);
      
      // Re-throw the error so HomePage can handle it
      throw error;
    }
  };

  const handleSchedule = async (draftToSchedule: DraftPost, scheduledForOptional?: string) => {
    // Accept an explicit schedule time from the picker; default to +1h if missing
    const scheduledFor = scheduledForOptional || new Date(Date.now() + 60 * 60 * 1000).toISOString();
    
    try {
      // 1) Ensure LinkedIn cookie token is synced to DB so the worker can use it
      try {
        await authService.makeAuthenticatedRequest(`/api/user/linkedin-sync`, {
          method: 'POST',
          // Include cookies for linkedin_access_token
          credentials: 'include',
        });
      } catch (e) {
        console.warn('LinkedIn token sync failed (continuing):', e);
      }

      // 2) Create scheduled post
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

  const handleReschedulePost = (post: ScheduledPost) => {
    setRescheduleTarget(post);
    const d = new Date(post.scheduledFor);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    setRescheduleAt(`${yyyy}-${mm}-${dd}T${hh}:${mi}`);
  };

  const confirmReschedule = async () => {
    if (!rescheduleTarget) return;
    try {
      // Sync LinkedIn cookie token to DB to ensure worker can post after reschedule
      try {
        await authService.makeAuthenticatedRequest(`/api/user/linkedin-sync`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (e) {
        console.warn('LinkedIn token sync failed (continuing):', e);
      }

      const iso = new Date(rescheduleAt).toISOString();
      const updatedPost = await updateScheduledPost(rescheduleTarget.id, { scheduledFor: iso });
      const newScheduled = scheduled.map(p => p.id === rescheduleTarget.id ? updatedPost : p);
      setScheduled(newScheduled);
      setRescheduleTarget(null);
      alert(`Post rescheduled for ${new Date(iso).toLocaleString()}!`);
    } catch (error) {
      console.error('Failed to reschedule post:', error);
      alert(`Failed to reschedule post: ${error.message}`);
    }
  };

  const cancelReschedule = () => {
    setRescheduleTarget(null);
  };

  const handleCancelPost = async (post: ScheduledPost) => {
    if (!confirm(`Are you sure you want to cancel the scheduled post "${post.title}"?`)) {
      return;
    }
    
    try {
      const response = await authService.makeAuthenticatedRequest(`/api/posts/scheduled/${post.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));

      const newScheduled = scheduled.filter(p => p.id !== post.id);
      setScheduled(newScheduled);

      if (data && data.draft) {
        setDrafts(prev => [data.draft, ...prev]);
        alert(`Scheduled post "${post.title}" has been cancelled and moved back to Drafts.`);
      } else {
        alert(`Scheduled post "${post.title}" has been cancelled.`);
      }
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

  const handleCloseEditor = () => {
    setEditingDraft(null);
    setEditingScheduledId(null);
  };

  const handleRefreshScheduled = async () => {
    try {
      const scheduledPosts = await getScheduledPosts();
      setScheduled(scheduledPosts);
    } catch (error) {
      console.error('Failed to refresh scheduled posts:', error);
    }
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

  const renderPage = () => {
    switch(currentPage) {
      case 'drafts':
        return (
          <DraftsPage
            drafts={drafts}
            onSelectDraft={handleSelectDraft}
            onDeleteDraft={handleDeleteDraft}
          />
        );
      case 'scheduled':
        return (
          <ScheduledPage
            scheduled={scheduled}
            onSelectScheduled={handleSelectScheduled}
            onReschedulePost={handleReschedulePost}
            onCancelPost={handleCancelPost}
          />
        );
      case 'published':
        return <PublishedPage published={published} />;
      case 'home':
      default:
        return (
          <HomePage
            settings={settings!}
            onAddDraft={handleAddDraft}
            onPublish={handlePublish}
            onSchedule={handleSchedule}
            onNavigateToSettings={() => setView('settings')}
          />
        );
    }
  };
  
  const renderContent = () => {
    switch(view) {
      case 'prompts':
        // Only allow super admins to access
        if (!authState.user?.superAdmin) {
          return (
            <div className="flex items-center justify-center min-h-screen bg-base-200">
              <p className="text-content">Access denied. Super admin privileges required.</p>
            </div>
          );
        }
        return <PromptManagementPage />;
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
              {renderPage()}
            </main>
            {editingDraft && (
               <DraftEditor 
                  draft={editingDraft} 
                  settings={settings}
                  onUpdate={handleUpdateDraft}
                  onPublish={handlePublish}
                  onClose={handleCloseEditor}
                  onSchedule={handleRefreshScheduled}
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
        isSuperAdmin={authState.user?.superAdmin}
        currentPage={currentPage}
        currentView={view}
        onNavigate={handleNavigate}
        onPageChange={setCurrentPage}
        onBackToDashboard={handleBackToDashboard}
        onLogout={handleLogout} 
      />
      {renderContent()}
      {rescheduleTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 p-6 rounded-xl shadow-2xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">Reschedule Post</h3>
            <p className="text-sm text-content-secondary mb-3 line-clamp-2">{rescheduleTarget.title}</p>
            <label htmlFor="reschedAt" className="text-sm text-content-secondary">New date & time</label>
            <input
              id="reschedAt"
              type="datetime-local"
              value={rescheduleAt}
              onChange={(e) => setRescheduleAt(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={cancelReschedule} className="px-4 py-2 text-sm rounded-md border border-base-300">Cancel</button>
              <button onClick={confirmReschedule} className="px-4 py-2 text-sm rounded-md text-white bg-blue-600 hover:bg-blue-700">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
