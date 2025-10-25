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
        console.log('Successfully posted to LinkedIn:', result);
    } catch (error) {
        console.error('Error posting to LinkedIn:', error);
        throw error;
    }
};