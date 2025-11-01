import type { PromptTemplate } from '../types';
import { authService } from './authService';

const API_BASE = '/api/prompts';

export const promptService = {
  async getAllTemplates(): Promise<PromptTemplate[]> {
    const response = await authService.makeAuthenticatedRequest(API_BASE, {
      method: 'GET',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch prompt templates');
    }
    
    const data = await response.json();
    return data.templates.map((t: any) => ({
      ...t,
      variables: JSON.parse(t.variables)
    }));
  },

  async getTemplate(id: string): Promise<PromptTemplate> {
    const response = await authService.makeAuthenticatedRequest(`${API_BASE}/${id}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch prompt template');
    }
    
    const data = await response.json();
    return {
      ...data.template,
      variables: JSON.parse(data.template.variables)
    };
  },

  async createTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromptTemplate> {
    const response = await authService.makeAuthenticatedRequest(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create prompt template');
    }
    
    const data = await response.json();
    return {
      ...data.template,
      variables: JSON.parse(data.template.variables)
    };
  },

  async updateTemplate(id: string, updates: Partial<Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PromptTemplate> {
    const response = await authService.makeAuthenticatedRequest(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update prompt template');
    }
    
    const data = await response.json();
    return {
      ...data.template,
      variables: JSON.parse(data.template.variables)
    };
  },

  async deleteTemplate(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete prompt template');
    }
  },
};
