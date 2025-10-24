import type { UserSettings, DraftPost, PublishedPost } from '../types';
import { authService } from './authService';

const API_BASE_URL = '/api';

interface Database {
    settings: UserSettings;
    drafts: DraftPost[];
    published: PublishedPost[];
}

// Helper function to handle API responses
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

// --- Public API for the Database Service ---

/**
 * Initializes the database by fetching user data from the API.
 * Returns the entire database contents.
 */
export const initializeDB = async (): Promise<Database> => {
    try {
        // Fetch user settings, drafts, and published posts in parallel
        const [settingsResponse, draftsResponse, publishedResponse] = await Promise.all([
            authService.makeAuthenticatedRequest(`${API_BASE_URL}/user/settings`),
            authService.makeAuthenticatedRequest(`${API_BASE_URL}/posts/drafts`),
            authService.makeAuthenticatedRequest(`${API_BASE_URL}/posts/published`),
        ]);

        const [settings, drafts, published] = await Promise.all([
            handleApiResponse(settingsResponse),
            handleApiResponse(draftsResponse),
            handleApiResponse(publishedResponse),
        ]);

        return {
            settings,
            drafts,
            published,
        };
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
};

/**
 * Saves the complete UserSettings object.
 */
export const saveUserSettings = async (settings: UserSettings): Promise<void> => {
    try {
        const response = await authService.makeAuthenticatedRequest(`${API_BASE_URL}/user/settings`, {
            method: 'PUT',
            body: JSON.stringify(settings),
        });

        await handleApiResponse(response);
    } catch (error) {
        console.error('Failed to save user settings:', error);
        throw error;
    }
};

/**
 * Saves a single draft post (creates or updates).
 */
export const saveDraft = async (draft: DraftPost): Promise<DraftPost> => {
    try {
        const isUpdate = draft.id && draft.id !== new Date().toISOString(); // Simple check for existing ID
        const url = isUpdate 
            ? `${API_BASE_URL}/posts/drafts/${draft.id}`
            : `${API_BASE_URL}/posts/drafts`;
        
        const method = isUpdate ? 'PUT' : 'POST';
        
        const response = await authService.makeAuthenticatedRequest(url, {
            method,
            body: JSON.stringify({
                title: draft.title,
                text: draft.text,
                imageUrl: draft.imageUrl,
                isPublishing: draft.isPublishing,
            }),
        });

        return await handleApiResponse(response);
    } catch (error) {
        console.error('Failed to save draft:', error);
        throw error;
    }
};

/**
 * Saves the entire array of draft posts (legacy compatibility).
 * Note: This is less efficient than individual saves but maintains compatibility.
 */
export const saveDrafts = async (drafts: DraftPost[]): Promise<void> => {
    try {
        // For now, we'll just save each draft individually
        // In a real implementation, you might want a batch API endpoint
        await Promise.all(drafts.map(draft => saveDraft(draft)));
    } catch (error) {
        console.error('Failed to save drafts:', error);
        throw error;
    }
};

/**
 * Publishes a draft post (moves from drafts to published).
 */
export const publishPost = async (draft: DraftPost, publishedAt?: string): Promise<PublishedPost> => {
    try {
        const response = await authService.makeAuthenticatedRequest(`${API_BASE_URL}/posts/publish`, {
            method: 'POST',
            body: JSON.stringify({
                draftId: draft.id,
                publishedAt: publishedAt || new Date().toLocaleString(),
            }),
        });

        return await handleApiResponse(response);
    } catch (error) {
        console.error('Failed to publish post:', error);
        throw error;
    }
};

/**
 * Saves the entire array of published posts (legacy compatibility).
 * Note: Published posts are typically created via publishPost, not directly saved.
 */
export const savePublishedPosts = async (posts: PublishedPost[]): Promise<void> => {
    // This function is mainly for legacy compatibility
    // In the new system, published posts are created via the publish endpoint
    console.warn('savePublishedPosts is deprecated. Use publishPost instead.');
};

/**
 * Deletes a draft post.
 */
export const deleteDraft = async (draftId: string): Promise<void> => {
    try {
        const response = await authService.makeAuthenticatedRequest(`${API_BASE_URL}/posts/drafts/${draftId}`, {
            method: 'DELETE',
        });

        await handleApiResponse(response);
    } catch (error) {
        console.error('Failed to delete draft:', error);
        throw error;
    }
};

/**
 * Gets user profile information.
 */
export const getUserProfile = async () => {
    try {
        const response = await authService.makeAuthenticatedRequest(`${API_BASE_URL}/user/profile`);
        return await handleApiResponse(response);
    } catch (error) {
        console.error('Failed to get user profile:', error);
        throw error;
    }
};
