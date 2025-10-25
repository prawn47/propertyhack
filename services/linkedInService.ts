/**
 * Simple LinkedIn Service - Uses cookie-based authentication
 * Matches the approach from the working example project
 */

interface PostPayload {
    text: string;
    base64Image?: string;
}

// Post to LinkedIn using the exact same route as working app
export const postToLinkedIn = async (payload: PostPayload): Promise<void> => {
    try {
        const startedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const response = await fetch('/api/linkedin/post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: payload.text,
                image: payload.base64Image, // Match working app field name
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        const result = await response.json();
        const endedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        console.log(`[metrics] linkedinPostMs=${(endedAt - startedAt).toFixed(0)}`);
        console.log('Successfully posted to LinkedIn:', result);
    } catch (error) {
        console.error('Error posting to LinkedIn:', error);
        throw error;
    }
};