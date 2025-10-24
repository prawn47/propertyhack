import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SettingsPanel from './components/SettingsPanel';
import ContentGenerator from './components/ContentGenerator';
import DraftEditor from './components/DraftEditor';
import DashboardSection from './components/DashboardSection';
import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';
import Loader from './components/Loader';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import type { UserSettings, DraftPost, PublishedPost, User, AuthState } from './types';
import * as db from './services/dbService';
import { postToLinkedIn } from './services/linkedInService';
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
  const [editingDraft, setEditingDraft] = useState<DraftPost | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

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
    // Load data only when authenticated
    if (authState.isAuthenticated) {
      const loadData = async () => {
        setIsLoadingData(true);
        try {
          const initialData = await db.initializeDB();
          setSettings(initialData.settings);
          setDrafts(initialData.drafts);
          setPublished(initialData.published);
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
      setEditingDraft(null);
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
      alert(`Failed to publish post. Please check the console for details. Ensure your Access Token is correct.`);
      // Reset loading state on failure
      setDraftPublishingState(draftToPublish.id, false);
    }
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

  const renderDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <ContentGenerator 
            settings={settings} 
            onNewDraft={handleAddDraft} 
            onPublish={handlePublish}
        />
        <DashboardSection 
            title="Recent Drafts" 
            posts={drafts} 
            onSelectPost={handleSelectDraft}
        />
      </div>
      <div className="space-y-6">
        <SettingsPanel settings={settings} />
        <DashboardSection title="Published Posts" posts={published} />
      </div>
    </div>
  );
  
  const renderContent = () => {
    switch(view) {
      case 'settings':
        return <SettingsPage settings={settings} onChange={setSettings} onSave={handleSaveSettings} onBack={handleBackToDashboard} />;
      case 'profile':
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
