import React, { useState, useEffect } from 'react';
import type { PromptTemplate } from '../types';
import { promptService } from '../services/promptService';

export const PromptManagementPage: React.FC = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template: '',
    variables: '',
    isActive: true,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await promptService.getAllTemplates();
      setTemplates(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      template: '',
      variables: '',
      isActive: true,
    });
  };

  const handleEdit = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setIsCreating(false);
    setFormData({
      name: template.name,
      description: template.description,
      template: template.template,
      variables: template.variables.join(', '),
      isActive: template.isActive,
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      template: '',
      variables: '',
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const variables = formData.variables
        .split(',')
        .map(v => v.trim())
        .filter(v => v);

      if (editingTemplate) {
        await promptService.updateTemplate(editingTemplate.id, {
          name: formData.name,
          description: formData.description,
          template: formData.template,
          variables,
          isActive: formData.isActive,
        });
      } else {
        await promptService.createTemplate({
          name: formData.name,
          description: formData.description,
          template: formData.template,
          variables,
          isActive: formData.isActive,
        });
      }

      await loadTemplates();
      handleCancel();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt template?')) return;
    
    try {
      await promptService.deleteTemplate(id);
      await loadTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-600">Loading prompt templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Prompt Engineering</h1>
          <p className="text-gray-600 mt-2">Edit system prompts to control how AI generates content for all users</p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              💡 <strong>How this works:</strong> Each template controls a specific feature. Edit the prompts to change AI behavior. 
              Use <code className="bg-blue-100 px-1 rounded">{'{{variableName}}'}</code> for dynamic user settings.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {editingTemplate && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Edit Prompt Template
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this template's purpose"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template
                </label>
                <textarea
                  value={formData.template}
                  onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  rows={12}
                  placeholder="System prompt with {{variable}} placeholders"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Use {`{{variableName}}`} for dynamic values from user settings
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variables
                </label>
                <input
                  type="text"
                  value={formData.variables}
                  onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="toneOfVoice, industry, position (comma-separated)"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Field names from UserSettings that this template uses
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{template.name}</h3>
                  <p className="text-gray-600 mt-1">{template.description}</p>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      template.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {template.variables.length > 0 ? (
                    template.variables.map((v) => (
                      <span
                        key={v}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                      >
                        {v}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">None</span>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Template:</p>
                <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto max-h-48 overflow-y-auto">
                  {template.template}
                </pre>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(template)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  Edit Prompt
                </button>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-600">No prompt templates configured yet. Templates are created by developers when adding new features.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
