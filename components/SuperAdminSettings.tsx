import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SuperAdminSettingsProps {
  onBack: () => void;
}

const SuperAdminSettings: React.FC<SuperAdminSettingsProps> = ({ onBack }) => {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setIsLoading(true);
      const data = await authService.makeAuthenticatedRequest('/api/super-admin/system-prompts');
      setPrompts(data.prompts || []);
    } catch (error) {
      console.error('Error fetching system prompts:', error);
      setError('Failed to load system prompts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (prompt: SystemPrompt) => {
    setEditingPrompt({ ...prompt });
    setError(null);
    setSuccessMessage(null);
  };

  const handleCancel = () => {
    setEditingPrompt(null);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!editingPrompt) return;

    try {
      setIsSaving(true);
      setError(null);
      
      const updated = await authService.makeAuthenticatedRequest(
        `/api/super-admin/system-prompts/${editingPrompt.name}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            description: editingPrompt.description,
            content: editingPrompt.content,
            isActive: editingPrompt.isActive
          })
        }
      );

      setPrompts(prev => 
        prev.map(p => p.name === editingPrompt.name ? updated.prompt : p)
      );
      setSuccessMessage('System prompt updated successfully');
      setEditingPrompt(null);
    } catch (error) {
      console.error('Error saving system prompt:', error);
      setError('Failed to save system prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (name: string) => {
    try {
      const updated = await authService.makeAuthenticatedRequest(
        `/api/super-admin/system-prompts/${name}/toggle`,
        { method: 'PATCH' }
      );
      
      setPrompts(prev => 
        prev.map(p => p.name === name ? updated.prompt : p)
      );
      setSuccessMessage('Status toggled successfully');
    } catch (error) {
      console.error('Error toggling prompt:', error);
      setError('Failed to toggle prompt status');
    }
  };

  const handleCreateNew = () => {
    setEditingPrompt({
      id: 'new',
      name: '',
      description: '',
      content: '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setError(null);
    setSuccessMessage(null);
  };

  if (isLoading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="bg-base-100 p-8 rounded-xl shadow-md">
          <p className="text-center text-content-secondary">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in-up">
      <div className="bg-base-100 p-6 sm:p-8 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-content">Super Admin Settings</h1>
          <button 
            onClick={onBack} 
            className="text-sm font-semibold text-brand-primary hover:text-brand-secondary"
          >
            &larr; Back to Settings
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {successMessage}
          </div>
        )}

        {!editingPrompt ? (
          <>
            <div className="mb-6">
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary"
              >
                + Create New System Prompt
              </button>
            </div>

            <div className="space-y-4">
              {prompts.length === 0 ? (
                <p className="text-content-secondary text-center py-8">
                  No system prompts configured yet. Create one to get started.
                </p>
              ) : (
                prompts.map(prompt => (
                  <div 
                    key={prompt.id} 
                    className="border border-base-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg text-content">{prompt.name}</h3>
                          <span className={`text-xs px-2 py-1 rounded ${
                            prompt.isActive 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {prompt.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-content-secondary mt-1">{prompt.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggle(prompt.name)}
                          className="px-3 py-1 text-sm border border-base-300 rounded hover:bg-base-200"
                        >
                          {prompt.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleEdit(prompt)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-base-200 rounded">
                      <p className="text-xs text-content-secondary font-mono whitespace-pre-wrap">
                        {prompt.content.substring(0, 200)}
                        {prompt.content.length > 200 && '...'}
                      </p>
                    </div>
                    <p className="text-xs text-content-secondary mt-2">
                      Last updated: {new Date(prompt.updatedAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-content-secondary mb-1">
                Name (identifier)
              </label>
              <input
                type="text"
                id="name"
                value={editingPrompt.name}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                disabled={editingPrompt.id !== 'new'}
                placeholder="e.g., super_admin_rules or news_comment_generation"
                className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md disabled:opacity-50"
              />
              {editingPrompt.id === 'new' && (
                <p className="text-xs text-content-secondary mt-1">
                  Use underscores, lowercase. Common names: super_admin_rules, news_comment_generation
                </p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-content-secondary mb-1">
                Description
              </label>
              <input
                type="text"
                id="description"
                value={editingPrompt.description}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, description: e.target.value })}
                placeholder="Brief description of what this prompt does"
                className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-content-secondary mb-1">
                Prompt Content
              </label>
              <textarea
                id="content"
                value={editingPrompt.content}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                rows={15}
                placeholder="Enter the system prompt or rules here..."
                className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={editingPrompt.isActive}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, isActive: e.target.checked })}
                className="rounded border-base-300 text-brand-primary"
              />
              <label htmlFor="isActive" className="text-sm text-content">
                Active
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-base-300">
              <button
                onClick={handleCancel}
                className="px-6 py-2 border border-base-300 text-content rounded-md hover:bg-base-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editingPrompt.name || !editingPrompt.description || !editingPrompt.content}
                className="px-6 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default SuperAdminSettings;
