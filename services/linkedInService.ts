/**
 * NOTE: The LinkedIn API calls here are structured based on the official V2 documentation.
 * A proxy server is required to handle these API calls from a client-side application
 * to avoid CORS issues and to securely manage the access token if a full server-side
 * OAuth flow is implemented. For this development environment, we assume direct calls
 * might work or that a proxy is implicitly available.
 */

const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;

interface PostPayload {
    text: string;
    base64Image?: string;
}

// Helper to create authenticated headers
const createAuthHeaders = () => {
    if (!LINKEDIN_ACCESS_TOKEN) {
        throw new Error("LinkedIn Access Token is not configured. Please add it to your .env file.");
    }
    return {
        'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
    };
};

// Step 1: Get the authenticated user's profile to find their person URN
const getPersonUrn = async (): Promise<string> => {
    const response = await fetch(`${LINKEDIN_API_URL}/me`, {
        method: 'GET',
        headers: createAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch LinkedIn profile: ${response.statusText}`);
    }
    const profile = await response.json();
    return `urn:li:person:${profile.id}`;
};

// Helper function to convert Base64 to Blob
const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

// Step 2 & 3: Register and Upload the image
const uploadImage = async (authorUrn: string, base64Image: string): Promise<string> => {
    const mimeType = base64Image.substring("data:".length, base64Image.indexOf(";base64"));
    const imageData = base64Image.split(',')[1];
    
    // Step 2: Register the upload
    const registerUploadResponse = await fetch(`${LINKEDIN_API_URL}/assets?action=registerUpload`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
            registerUploadRequest: {
                recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
                owner: authorUrn,
                serviceRelationships: [{
                    relationshipType: "OWNER",
                    identifier: "urn:li:userGeneratedContent"
                }]
            }
        })
    });

    if (!registerUploadResponse.ok) {
        throw new Error(`Failed to register image upload: ${registerUploadResponse.statusText}`);
    }
    const uploadData = await registerUploadResponse.json();
    const uploadUrl = uploadData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    const assetUrn = uploadData.value.asset;

    // Step 3: Upload the image bytes
    const imageBlob = base64ToBlob(imageData, mimeType);
    const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
            'Content-Type': mimeType,
        },
        body: imageBlob,
    });
    
    if (!uploadResponse.ok) {
        throw new Error(`Failed to upload image: ${uploadResponse.statusText}`);
    }

    return assetUrn;
};

// Step 4: Create the post (share)
export const postToLinkedIn = async (payload: PostPayload): Promise<void> => {
    const authorUrn = await getPersonUrn();
    let imageAssetUrn: string | undefined;

    if (payload.base64Image) {
        imageAssetUrn = await uploadImage(authorUrn, payload.base64Image);
    }
    
    const shareContent = {
        content: {
            contentEntities: imageAssetUrn ? [{
                entityLocation: 'https://www.linkedin.com', // Dummy location
                thumbnails: [{
                    "resolvedUrl": "https://www.linkedin.com" // Dummy image
                }]
            }] : [],
            title: payload.text.split('\n')[0].substring(0, 200), // Use first line as title
            shareMediaCategory: imageAssetUrn ? 'IMAGE' : 'NONE',
        },
        distribution: {
            linkedInDistributionTarget: {}
        },
        owner: authorUrn,
        text: {
            text: payload.text,
        },
        subject: payload.text.split('\n')[0].substring(0, 200) // Use first line as subject
    };

    // If there is an image, we structure the post differently
    const postBody: any = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                    text: payload.text,
                },
                shareMediaCategory: 'NONE',
            },
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'CONNECTIONS',
        },
    };

    if (imageAssetUrn) {
        postBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
        postBody.specificContent['com.linkedin.ugc.ShareContent'].media = [
            {
                status: 'READY',
                media: imageAssetUrn,
            },
        ];
    }
    
    const response = await fetch(`${LINKEDIN_API_URL}/ugcPosts`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify(postBody),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("LinkedIn API Error:", errorBody);
        throw new Error(`Failed to create LinkedIn post: ${response.statusText}`);
    }

    await response.json();
};
